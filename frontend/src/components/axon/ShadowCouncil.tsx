import { useState, useRef, useEffect, useCallback } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, X, Square, ChevronDown, ChevronRight, GitBranch } from "lucide-react";
import {
  queryCouncil,
  getSuggestions,
  synthesizeSpeech,
  playAudioSfx,
} from "@/lib/api";
import { stopAllAudio, registerAudio } from "@/lib/audioController";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { CouncilResponse } from "@/lib/api";

export interface ReasoningStep {
  agent: string;
  output: string;
  timestamp?: string;
}

interface Agent {
  id: string;
  name: string;
  role: "optimist" | "chief" | "skeptic";
  message: string;
  isTyping?: boolean;
}

const defaultAgents: Agent[] = [
  {
    id: "1",
    name: "Optimist",
    role: "optimist",
    message: "Ask a question to get perspectives from the Shadow Council.",
  },
  {
    id: "2",
    name: "Chief of Staff",
    role: "chief",
    message: "Synthesizing perspectives...",
    isTyping: true,
  },
  {
    id: "3",
    name: "Skeptic",
    role: "skeptic",
    message: "Type your question and press Ask.",
  },
];

const FALLBACK_QUESTIONS = [
  "What changed today?",
  "What are the biggest risks to our Q1 product launch?",
  "What dependencies could block our roadmap?",
  "Where do we have alignment gaps?",
  "What's the highest-impact decision we should make this week?",
];

const roleColors = {
  optimist: {
    dot: "bg-success",
    avatar: "bg-success/20 text-success",
    bubble: "bg-[#0f1f0f] border-[#1a3a1a]",
    heading: "text-success",
  },
  chief: {
    dot: "bg-info",
    avatar: "bg-info/20 text-info",
    bubble: "bg-secondary border-border",
    heading: "text-info",
  },
  skeptic: {
    dot: "bg-warning",
    avatar: "bg-warning/20 text-warning",
    bubble: "bg-[#1f1709] border-[#3a2a0a]",
    heading: "text-warning",
  },
};

/** Format long LLM text into readable blocks: paragraphs and lists */
function formatAgentMessage(text: string) {
  if (!text?.trim()) return null;
  const blocks = text.split(/\n\n+/).filter((b) => b.trim());
  return blocks.map((block, i) => {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const isList =
      lines.length > 1 &&
      lines.every(
        (l) =>
          /^[-•*]\s/.test(l) ||
          /^\d+[.)]\s/.test(l) ||
          l.startsWith("·")
      );
    if (isList) {
      return (
        <ul key={i} className="list-disc list-inside space-y-1 my-1.5 text-[11px] text-text-secondary">
          {lines.map((line, j) => (
            <li key={j} className="leading-relaxed">
              {line.replace(/^[-•*·]\s/, "").replace(/^\d+[.)]\s/, "")}
            </li>
          ))}
        </ul>
      );
    }
    return (
      <p key={i} className="my-1.5 text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
        {block.trim()}
      </p>
    );
  });
}

function responseToAgents(res: CouncilResponse): Agent[] {
  return [
    { id: "1", name: "Optimist", role: "optimist", message: res.optimist_view },
    { id: "2", name: "Chief of Staff", role: "chief", message: res.final_answer },
    { id: "3", name: "Skeptic", role: "skeptic", message: res.skeptic_view },
  ];
}

function parseReasoningTrace(trace: unknown[]): ReasoningStep[] {
  if (!Array.isArray(trace)) return [];
  return trace
    .filter((t): t is { agent?: string; output?: string; timestamp?: string } => t != null && typeof t === "object")
    .map((t) => ({
      agent: String(t.agent ?? "Agent"),
      output: String(t.output ?? ""),
      timestamp: t.timestamp ? String(t.timestamp) : undefined,
    }))
    .filter((t) => t.output.trim());
}

/** One-line summary for reasoning step (first sentence or first ~80 chars) */
function stepSummary(output: string, maxLen = 80): string {
  const trimmed = output.trim();
  const firstLine = trimmed.split(/\n/)[0]?.trim() ?? trimmed;
  if (firstLine.length <= maxLen) return firstLine;
  return firstLine.slice(0, maxLen).trim() + "…";
}

export function ShadowCouncil() {
  const [isActive, setIsActive] = useState(false);
  const [question, setQuestion] = useState("");
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const [councilQuestions, setCouncilQuestions] = useState<string[]>(FALLBACK_QUESTIONS);
  const [reasoningTrace, setReasoningTrace] = useState<ReasoningStep[]>([]);
  const [reasoningOpen, setReasoningOpen] = useState(true);
  const abortRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const onSpeechResult = useCallback((transcript: string) => {
    setQuestion((q) => (q ? `${q} ${transcript}` : transcript));
  }, []);
  const { isListening: isMicListening, startListening: startMic, stopListening: stopMic, supported: micSupported } = useSpeechRecognition(onSpeechResult);

  const handleStopVoice = useCallback(() => {
    stopAllAudio();
    setIsVoicePlaying(false);
    abortRef.current = true;
  }, []);

  useEffect(() => {
    if (isActive) {
      getSuggestions()
        .then((r) => {
          if (r.council_questions?.length) setCouncilQuestions(r.council_questions);
        })
        .catch(() => {});
    }
  }, [isActive]);

  const handleAsk = async () => {
    const q = question.trim();
    if (q.length < 5) {
      setError("Question must be at least 5 characters");
      return;
    }
    setError(null);
    abortRef.current = false;
    stopAllAudio();
    setIsVoicePlaying(false);
    setLoading(true);
    setAgents([
      { id: "1", name: "Optimist", role: "optimist", message: "...", isTyping: true },
      { id: "2", name: "Chief of Staff", role: "chief", message: "Querying Shadow Council...", isTyping: true },
      { id: "3", name: "Skeptic", role: "skeptic", message: "...", isTyping: true },
    ]);

    try {
      const result = await queryCouncil(q);
      if (abortRef.current) return;
      setAgents(responseToAgents(result));
      setReasoningTrace(parseReasoningTrace(result.reasoning_trace ?? []));

      if (voiceOn && result.final_answer) {
        stopAllAudio();
        const url = await synthesizeSpeech(result.final_answer);
        if (!url || abortRef.current) return;

        const audio = new Audio(url);
        const cleanup = () => {
          URL.revokeObjectURL(url);
          setIsVoicePlaying(false);
        };
        audio.onended = cleanup;
        audio.onerror = cleanup;
        registerAudio(audio);
        audio.play().then(() => setIsVoicePlaying(true)).catch(cleanup);
      }
    } catch (e) {
      if (abortRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to query council");
      setAgents(defaultAgents);
      setReasoningTrace([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bottom Bar - Fixed */}
      <div
        className="fixed bottom-0 left-0 right-0 h-14 z-40 border-t border-border flex flex-col items-center justify-center backdrop-blur-panel"
        style={{ background: "linear-gradient(180deg, transparent, hsl(0 0% 4%) 20%)" }}
      >
        {/* Voice Button */}
        <button
          onClick={() => {
            playAudioSfx("confirm");
            setIsActive(!isActive);
          }}
          className={`w-[240px] h-9 flex items-center justify-center gap-2 border transition-default
            ${
              isActive
                ? "border-success/50 bg-success/10 glow-success"
                : "border-border-subtle bg-gradient-to-b from-secondary to-background hover:border-text-hint"
            }`}
        >
          {isActive ? <MicOff className="w-4 h-4 text-success" /> : <Mic className="w-4 h-4 text-text-tertiary" />}
          <span className="text-sm text-text-secondary">{isActive ? "Listening..." : "Ask Chief of Staff"}</span>
        </button>

        <span className="text-[10px] text-text-muted italic mt-1">
          {isActive ? "Shadow Council activated" : "Press to activate Shadow Council"}
        </span>
      </div>

      {/* Overlay Panel */}
      {isActive && (
        <div
          className="fixed bottom-14 left-0 right-0 h-[380px] sm:h-[420px] border-t border-border-subtle backdrop-blur-strong z-50 overflow-hidden flex flex-col"
          style={{ background: "hsla(0, 0%, 4%, 0.95)" }}
        >
          {/* Close button */}
          <button
            onClick={() => {
              handleStopVoice();
              setIsActive(false);
            }}
            className="absolute top-2 left-2 p-2 rounded border border-border hover:bg-secondary/50 text-text-muted hover:text-foreground transition-default z-10"
            title="Minimize"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Question input */}
          <div className="pl-12 pr-2 py-2 flex gap-2 items-center border-b border-border">
            <button
              type="button"
              onClick={() => {
                playAudioSfx("soft");
                setVoiceOn(!voiceOn);
              }}
              className={`p-2 rounded border transition-default ${
                voiceOn ? "border-success/50 bg-success/10 text-success" : "border-border text-text-muted hover:text-text-secondary"
              }`}
              title={voiceOn ? "Voice on" : "Voice off"}
            >
              {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder={councilQuestions[0] ? `e.g. ${councilQuestions[0].slice(0, 45)}…` : "e.g. What are the biggest risks?"}
              className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded text-foreground placeholder:text-text-muted"
              disabled={loading}
            />
            {micSupported && (
              <button
                type="button"
                onClick={isMicListening ? stopMic : startMic}
                className={`p-2 rounded border transition-default ${
                  isMicListening ? "border-error/50 bg-error/10 text-error" : "border-border text-text-muted hover:text-text-secondary"
                }`}
                title={isMicListening ? "Stop listening" : "Voice input"}
              >
                <Mic className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                playAudioSfx("confirm");
                handleAsk();
              }}
              disabled={loading}
              className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50 transition-default"
            >
              <Send className="w-4 h-4" />
              {loading ? "Asking..." : "Ask"}
            </button>
          </div>
          {error && <div className="px-3 py-2 text-error text-xs bg-error/10">{error}</div>}

          {/* Data-driven question suggestions */}
          <div className="px-2 py-1.5 border-b border-border">
            <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
              Try a question (based on current data)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {councilQuestions.map((mq) => (
                <button
                  key={mq}
                  type="button"
                  onClick={() => {
                    playAudioSfx("soft");
                    setQuestion(mq);
                  }}
                  className="px-2 py-1 text-[11px] rounded border border-border bg-background hover:bg-secondary/50 text-text-secondary transition-default text-left max-w-full truncate"
                >
                  {mq}
                </button>
              ))}
            </div>
          </div>

          {/* Reasoning trace: Question → Optimist → Skeptic → Chief */}
          {reasoningTrace.length > 0 && (
            <div className="shrink-0 border-b border-border">
              <button
                type="button"
                onClick={() => setReasoningOpen(!reasoningOpen)}
                className="w-full px-3 py-2 flex items-center gap-2 text-left bg-secondary/30 hover:bg-secondary/50 transition-default"
              >
                <GitBranch className="w-4 h-4 text-info shrink-0" />
                <span className="text-xs font-medium text-foreground">Agentic reasoning flow</span>
                {reasoningOpen ? (
                  <ChevronDown className="w-4 h-4 text-text-muted ml-auto" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-text-muted ml-auto" />
                )}
              </button>
              {reasoningOpen && (
                <div className="px-3 pb-2 pt-0 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                    <span className="font-medium text-text-secondary">Question</span>
                    <span className="flex-1 truncate">{question || "—"}</span>
                  </div>
                  {reasoningTrace.map((step, i) => (
                    <div key={i} className="flex gap-2">
                      <div className="flex flex-col items-center shrink-0">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            step.agent === "Optimist"
                              ? "bg-success"
                              : step.agent === "Skeptic"
                                ? "bg-warning"
                                : "bg-info"
                          }`}
                        />
                        {i < reasoningTrace.length - 1 && (
                          <div className="w-px flex-1 min-h-[12px] bg-border my-0.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <span className="text-[10px] font-medium text-text-secondary">{step.agent}</span>
                        <p className="text-[10px] text-text-muted leading-snug mt-0.5">
                          {stepSummary(step.output)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Agent panels - scrollable, formatted sections */}
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border overflow-auto">
            {agents.map((agent) => {
              const colors = roleColors[agent.role];
              return (
                <div key={agent.id} className="bg-background p-3 flex flex-col min-h-[120px]">
                  <div className="flex items-center gap-2 mb-2 shrink-0 border-b border-border/50 pb-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                    <h3 className={`text-sm font-semibold uppercase tracking-wide ${colors.heading}`}>
                      {agent.name}
                    </h3>
                  </div>
                  <div className={`flex-1 p-2.5 border rounded overflow-auto min-h-0 ${colors.bubble}`}>
                    {agent.isTyping ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-text-tertiary">{agent.message}</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-0">
                        {formatAgentMessage(agent.message) ?? (
                          <p className="text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap">
                            {agent.message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
