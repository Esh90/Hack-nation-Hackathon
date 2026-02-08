import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { ArrowLeft, AlertTriangle, Send, Mic, Square } from "lucide-react";
import { analyzeWithCritic, getSuggestions, transcribeSpeech, playAudioSfx } from "@/lib/api";
import type { CriticContradiction } from "@/lib/api";

const FALLBACK_EXAMPLES = [
  "The manager just said the deadline is Friday. Please update the team.",
  "Voice note: Launch date confirmed in standup.",
  "Meeting summary: Budget approved. Please align records.",
  "New info: timeline changed. Check for contradictions.",
];

export default function CriticAgentPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const navigate = useNavigate();

  const [input, setInput] = useState("");
  const [criticExamples, setCriticExamples] = useState<string[]>(FALLBACK_EXAMPLES);
  const [result, setResult] = useState<{
    input_summary: string;
    contradictions: CriticContradiction[];
    contradiction_count: number;
    has_contradictions: boolean;
    recommendation: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    getSuggestions()
      .then((r) => {
        if (r.critic_examples?.length) setCriticExamples(r.critic_examples);
      })
      .catch(() => {});
  }, []);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        if (!chunksRef.current.length) return;

        const blob = new Blob(chunksRef.current, { type: mime });
        setTranscribing(true);

        try {
          const text = await transcribeSpeech(blob);
          if (text) setInput((p) => (p ? `${p} ${text}` : text));
          else setError("Transcription failed.");
        } catch {
          setError("Transcription failed.");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start(200);
      setRecording(true);
    } catch {
      setError("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
    }
  };

  const handleAnalyze = async () => {
    const text = input.trim();
    if (text.length < 5) {
      setError("Enter at least 5 characters");
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);

    try {
      const res = await analyzeWithCritic(text);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      <header className="h-11 bg-background border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playAudioSfx("tab");
              navigate("/");
            }}
            className="p-2 rounded border border-border hover:bg-secondary/50 transition-default text-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground">Critic Agent</h1>
            <span className="text-[10px] text-text-muted">
              Cross-reference with Knowledge Graph
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div
            className="p-3 border-2 rounded"
            style={{
              borderColor: isDark ? "hsl(var(--border))" : "#d1d5db",
              backgroundColor: isDark ? "hsl(var(--card))" : "#f9fafb",
            }}
          >
            <p className="text-[11px] text-text-primary">
              Enter a meeting summary or new info. The Critic Agent checks the Knowledge
              Graph and flags contradictions.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] text-text-muted">New input</label>

              <button
                onClick={() => {
                  playAudioSfx("soft");
                  recording ? stopRecording() : startRecording();
                }}
                disabled={loading || transcribing}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded border text-[11px] ${
                  recording
                    ? "border-error/50 bg-error/10 text-error"
                    : "border-border bg-background hover:bg-secondary/50 text-text-secondary"
                }`}
              >
                {recording ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Stop
                  </>
                ) : transcribing ? (
                  "Transcribing…"
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" /> Voice input
                  </>
                )}
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                criticExamples[0]
                  ? `e.g. ${criticExamples[0].slice(0, 50)}…`
                  : "Meeting summary or voice input"
              }
              className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-border rounded resize-y"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {criticExamples.map((ex, i) => (
              <button
                key={i}
                onClick={() => {
                  playAudioSfx("soft");
                  setInput(ex);
                }}
                className="px-2 py-1 text-[11px] rounded border border-border bg-background hover:bg-secondary/50"
              >
                {ex.slice(0, 50)}…
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              playAudioSfx("confirm");
              handleAnalyze();
            }}
            disabled={loading}
            className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground rounded"
          >
            <Send className="w-4 h-4" />
            {loading ? "Analyzing…" : "Analyze"}
          </button>

          {error && <div className="p-3 border border-error/50 bg-error/10">{error}</div>}

          {result && (
            <div className="space-y-4">
              {result.contradictions.map((c, i) => (
                <div key={i} className="p-3 border rounded flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  <p className="text-[11px] text-text-secondary">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
