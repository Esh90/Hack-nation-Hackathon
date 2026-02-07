import { ChevronDown } from "lucide-react";

export interface Decision {
  id: string;
  version: number;
  title: string;
  author: string;
  timeAgo: string;
  previousVersion?: number;
  isNew?: boolean;
}

interface DecisionStreamProps {
  decisions: Decision[];
}

export function DecisionStream({ decisions }: DecisionStreamProps) {
  const getNodeColor = (index: number, isNew?: boolean) => {
    if (isNew) return 'bg-success animate-pulse-glow';
    if (index < 3) return 'bg-info';
    return 'bg-text-hint';
  };

  const getNodeBorderColor = (index: number, isNew?: boolean) => {
    if (isNew) return 'border-success';
    if (index < 3) return 'border-info';
    return 'border-text-hint';
  };

  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Decision Stream</h2>
          <p className="text-[11px] text-text-muted">Versioned organizational truth</p>
        </div>
        <button className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-default">
          All Teams
          <ChevronDown className="w-3 h-3" />
        </button>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-4">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />

          {/* Entries */}
          <div className="space-y-3">
            {decisions.map((decision, index) => (
              <div key={decision.id} className="flex gap-3 relative">
                {/* Node */}
                <div 
                  className={`w-3 h-3 shrink-0 mt-3 border-2 relative z-10 ${getNodeColor(index, decision.isNew)} ${getNodeBorderColor(index, decision.isNew)}`}
                  style={{ borderRadius: '50%' }}
                />

                {/* Card */}
                <div 
                  className="flex-1 p-3.5 transition-default hover:bg-secondary/30 cursor-pointer group"
                  style={{ background: 'hsl(0 0% 5%)' }}
                >
                  {/* Version Badge */}
                  <span 
                    className="inline-block font-mono text-[10px] text-text-tertiary px-1.5 py-0.5 mb-2"
                    style={{ background: 'hsl(0 0% 10%)' }}
                  >
                    v{decision.version}
                  </span>

                  {/* Title */}
                  <h3 className="text-[13px] font-medium text-text-primary mb-1">
                    {decision.title}
                  </h3>

                  {/* Author & Time */}
                  <p className="text-[11px] text-text-muted mb-2">
                    by {decision.author} • {decision.timeAgo}
                  </p>

                  {/* Change Indicator */}
                  {decision.previousVersion && (
                    <p className="text-[10px] text-success mb-2">
                      ↗ Updated from v{decision.previousVersion}
                    </p>
                  )}

                  {/* View Link */}
                  <span className="text-[10px] text-text-muted group-hover:text-text-tertiary group-hover:underline transition-default">
                    View reasoning →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
