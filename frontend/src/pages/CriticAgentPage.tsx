import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, Send, Bell } from "lucide-react";
import { analyzeWithCritic } from "@/lib/api";
import type { CriticContradiction } from "@/lib/api";

const EXAMPLE_INPUTS = [
  "The manager just said the deadline is Friday. Please update the team.",
  "Voice note: Launch date is March 15th, confirmed in standup.",
  "Meeting summary: Budget approved at $2M for Engineering. David Kim signed off.",
  "Heard from Marcus—API v3 will be ready Wednesday. Q1 launch on track.",
];

export default function CriticAgentPage() {
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<{
    input_summary: string;
    contradictions: CriticContradiction[];
    contradiction_count: number;
    has_contradictions: boolean;
    recommendation: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* Header */}
      <header className="h-11 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded border border-border hover:bg-secondary/50 transition-default text-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground">
              Critic Agent
            </h1>
            <span className="text-[10px] text-text-muted">
              Cross-reference with Knowledge Graph
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Description */}
          <div className="p-3 border border-border bg-card">
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Enter a meeting summary, or any new
              information. The Critic Agent compares it against the Knowledge
              Graph and flags contradictions (e.g. &quot;Manager says Friday, Document says
              Wednesday&quot;) so you can notify both parties to resolve.
            </p>
          </div>

          {/* Input */}
          <div>
            <label className="text-[11px] text-text-muted block mb-1.5">
              New input (voice note / meeting summary)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. The manager just said the deadline is Friday. Please update the team."
              className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-border rounded text-foreground placeholder:text-text-muted resize-y"
              disabled={loading}
            />
          </div>

          {/* Example inputs */}
          <div>
            <div className="text-[10px] text-text-muted uppercase tracking-wide mb-2">
              Try an example
            </div>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_INPUTS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInput(ex)}
                  className="px-2 py-1 text-[11px] rounded border border-border bg-background hover:bg-secondary/50 text-text-secondary transition-default text-left max-w-full truncate"
                >
                  {ex.slice(0, 50)}…
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="px-4 py-2 flex items-center gap-2 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 disabled:opacity-50 transition-default"
          >
            <Send className="w-4 h-4" />
            {loading ? "Analyzing…" : "Analyze for contradictions"}
          </button>

          {error && (
            <div className="p-3 rounded border border-error/50 bg-error/10 text-error text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 pt-2">
              <div
                className={`p-3 rounded border ${
                  result.has_contradictions
                    ? "border-warning/50 bg-warning/10"
                    : "border-success/30 bg-success/5"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {result.has_contradictions ? (
                    <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                  ) : null}
                  <span
                    className={`text-sm font-medium ${
                      result.has_contradictions
                        ? "text-warning"
                        : "text-success"
                    }`}
                  >
                    {result.has_contradictions
                      ? `${result.contradiction_count} contradiction(s) detected`
                      : "No contradictions—aligned with Knowledge Graph"}
                  </span>
                </div>
                <p className="text-[11px] text-text-secondary">
                  {result.recommendation}
                </p>
              </div>

              {result.contradictions.map((c, i) => (
                <div
                  key={i}
                  className="p-4 rounded border border-warning/50 bg-warning/5"
                >
                  <div className="text-[10px] text-warning uppercase tracking-wide mb-2">
                    {c.type.replace(/_/g, " ")}
                  </div>
                  <p className="text-sm text-text-secondary mb-3">
                    {c.description}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                    <div>
                      <span className="text-text-muted">New input: </span>
                      <span className="text-foreground">{c.new_value}</span>
                    </div>
                    <div>
                      <span className="text-text-muted">Knowledge Graph: </span>
                      <span className="text-foreground">{c.kg_value}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-text-muted">Source: </span>
                      <span className="text-text-tertiary">{c.source_kg}</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-2 rounded bg-background/50 border border-border">
                    <Bell className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <div>
                      <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">
                        Notify
                      </div>
                      <div className="text-[11px] text-text-secondary">
                        {c.parties_to_notify.length > 0
                          ? c.parties_to_notify.join(", ")
                          : "Relevant stakeholders"}
                      </div>
                      <p className="text-[11px] text-text-tertiary mt-2">
                        {c.suggestion}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
