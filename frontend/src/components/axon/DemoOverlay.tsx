import { useState } from "react";
import { X, ChevronRight, ChevronLeft } from "lucide-react";

const DEMO_STEPS = [
  {
    title: "Knowledge graph",
    body: "This is your organizational intelligence map. People, topics, and decisions are connected by influences, dependencies, and conflicts.",
  },
  {
    title: "Live updates",
    body: "When a meeting ends or new info arrives, use the Admin (sparkle button) to add it in plain language. The graph updates and stays the single source of truth.",
  },
  {
    title: "What changed today?",
    body: "Founders ask one question: 'What changed today?' Tap the button in the top bar to see a visual map of updates and affected nodes.",
  },
  {
    title: "Visual delta",
    body: "Highlighted nodes and animated edges show how understanding spreads. The AI surfaces what matters without overwhelming you.",
  },
  {
    title: "Deconfliction",
    body: "The Critic Agent checks new input against the graph and flags contradictions. Quick check in the Conflicts panel or go to the Critic page. Notify the right people to resolve.",
  },
  {
    title: "Instant context",
    body: "A new stakeholder joins? Click any person on the graph to open their instant context: conflicts involving them, decisions that affect them, and who they influence.",
  },
];

interface DemoOverlayProps {
  open: boolean;
  onClose: () => void;
}

export function DemoOverlay({ open, onClose }: DemoOverlayProps) {
  const [step, setStep] = useState(0);

  if (!open) return null;

  const current = DEMO_STEPS[step];
  const isFirst = step === 0;
  const isLast = step === DEMO_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-[10px] uppercase tracking-widest text-text-muted">
            Demo · Step {step + 1} of {DEMO_STEPS.length}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded border border-border hover:bg-secondary/50 text-text-muted hover:text-foreground"
            aria-label="Close demo overlay"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">{current.title}</h2>
          <p className="text-sm text-text-secondary leading-relaxed">{current.body}</p>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={isFirst}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded border border-border hover:bg-secondary/50 disabled:opacity-40 disabled:pointer-events-none text-text-secondary"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Finish
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
