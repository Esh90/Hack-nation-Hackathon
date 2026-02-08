import { useState, useRef, useCallback } from "react";
import { Mic, MicOff, Send, Volume2, VolumeX, X, Square } from "lucide-react";
import { queryCouncil, synthesizeSpeech } from "@/lib/api";
import { stopAllAudio, registerAudio } from "@/lib/audioController";
import type { CouncilResponse } from "@/lib/api";

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

const MOCK_QUESTIONS = [
  "What are the biggest risks to our Q1 product launch?",
  "Should we prioritize the Pricing Strategy or Q1 Launch timeline?",
  "What dependencies could block our Engineering roadmap?",
  "Where do we have alignment gaps between Marketing and Finance?",
  "What's the highest-impact decision we should make this week?",
];

const roleColors = {
  optimist: {
    dot: "bg-success",
    avatar: "bg-success/20 text-success",
    bubble: "bg-[#0f1f0f] border-[#1a3a1a]",
  },
  chief: {
    dot: "bg-info",
    avatar: "bg-info/20 text-info",
    bubble: "bg-secondary border-border",
  },
  skeptic: {
    dot: "bg-warning",
    avatar: "bg-warning/20 text-warning",
    bubble: "bg-[#1f1709] border-[#3a2a0a]",
  },
};

function responseToAgents(res: CouncilResponse): Agent[] {
  return [
    { id: "1", name: "Optimist", role: "optimist", message: res.optimist_view },
    {
      id: "2",
      name: "Chief of Staff",
      role: "chief",
      message: res.final_answer,
    },
    { id: "3", name: "Skeptic", role: "skeptic", message: res.skeptic_view },
  ];
}

export function ShadowCouncil() {
  const [isActive, setIsActive] = useState(false);
  const [question, setQuestion] = useState("");
  const [agents, setAgents] = useState<Agent[]>(defaultAgents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false);
  const abortRef = useRef(false);

  const handleStopVoice = useCallback(() => {
    stopAllAudio();
    setIsVoicePlaying(false);
    abortRef.current = true;
  }, []);

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
        audio.play()
          .then(() => setIsVoicePlaying(true))
          .catch(cleanup);
      }
    } catch (e) {
      if (abortRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to query council");
      setAgents(defaultAgents);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bottom Bar - Fixed */}
      <div
        className="fixed bottom-0 left-0 right-0 h-14 z-40 border-t border-border flex flex-col items-center justify-center backdrop-blur-panel"
        style={{
          background: "linear-gradient(180deg, transparent, hsl(0 0% 4%) 20%)",
        }}
      >
        {/* Voice Button */}
        <button
          onClick={() => setIsActive(!isActive)}
          className={`w-[240px] h-9 flex items-center justify-center gap-2 border transition-default
            ${
              isActive
                ? "border-success/50 bg-success/10 glow-success"
                : "border-border-subtle bg-gradient-to-b from-secondary to-background hover:border-text-hint"
            }`}
        >
          {isActive ? (
            <MicOff className="w-4 h-4 text-success" />
          ) : (
            <Mic className="w-4 h-4 text-text-tertiary" />
          )}
          <span className="text-sm text-text-secondary">
            {isActive ? "Listening..." : "Ask Chief of Staff"}
          </span>
        </button>

        {/* Helper Text */}
        <span className="text-[10px] text-text-muted italic mt-1">
          {isActive
            ? "Shadow Council activated"
            : "Press to activate Shadow Council"}
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
          <div className="pl-12 pr-2 py-2 flex flex-wrap gap-2 items-center border-b border-border">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => {
                  if (isVoicePlaying) handleStopVoice();
                  setVoiceOn(!voiceOn);
                }}
                className={`p-2 rounded border transition-default ${
                  voiceOn
                    ? "border-success/50 bg-success/10 text-success"
                    : "border-border text-text-muted hover:text-text-secondary"
                }`}
                title={voiceOn ? "Voice on" : "Voice off"}
              >
                {voiceOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              {isVoicePlaying && (
                <button
                  type="button"
                  onClick={handleStopVoice}
                  className="p-2 rounded border border-error/50 bg-error/10 text-error hover:bg-error/20 transition-default"
                  title="Stop voice playback"
                  aria-label="Stop voice playback"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              )}
            </div>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="e.g. What are the biggest risks to our Q1 launch?"
              className="flex-1 min-w-[180px] px-3 py-2 text-sm bg-background border border-border rounded text-foreground placeholder:text-text-muted"
              disabled={loading}
            />
            <button
              onClick={handleAsk}
              disabled={loading}
              className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50 transition-default"
            >
              <Send className="w-4 h-4" />
              {loading ? "Asking..." : "Ask"}
            </button>
          </div>
          {error && (
            <div className="px-3 py-2 text-error text-xs bg-error/10">
              {error}
            </div>
          )}

          {/* Mock question suggestions */}
          <div className="px-2 py-1.5 border-b border-border shrink-0">
            <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
              Try a question
            </div>
            <div className="flex flex-wrap gap-1.5">
              {MOCK_QUESTIONS.map((mq) => (
                <button
                  key={mq}
                  type="button"
                  onClick={() => setQuestion(mq)}
                  className="px-2 py-1 text-[11px] rounded border border-border bg-background hover:bg-secondary/50 text-text-secondary transition-default text-left max-w-full truncate"
                >
                  {mq}
                </button>
              ))}
            </div>
          </div>

          {/* Agent panels - scrollable */}
          <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 gap-px bg-border overflow-auto">
            {agents.map((agent) => {
              const colors = roleColors[agent.role];
              return (
                <div key={agent.id} className="bg-background p-2 flex flex-col min-h-[120px]">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-2 shrink-0">
                    <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
                    <span className="text-xs font-medium text-text-secondary">
                      {agent.name}
                    </span>
                  </div>

                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium mb-2 shrink-0 ${colors.avatar}`}
                  >
                    {agent.name.charAt(0)}
                  </div>

                  {/* Speech Bubble */}
                  <div
                    className={`flex-1 p-2 border overflow-auto text-[11px] min-h-0 ${colors.bubble}`}
                  >
                    {agent.isTyping ? (
                      <div className="flex flex-col gap-2">
                        <span className="text-xs text-text-tertiary">
                          {agent.message}
                        </span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                          <span className="w-1.5 h-1.5 bg-text-muted rounded-full typing-dot" />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {agent.message}
                      </p>
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
