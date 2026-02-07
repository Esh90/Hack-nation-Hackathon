import { AlertTriangle } from "lucide-react";

export interface Conflict {
  id: string;
  team1: string;
  team2: string;
  topic: string;
  severity: 'Low' | 'Medium' | 'High';
  timeAgo: string;
}

interface ConflictListProps {
  conflicts: Conflict[];
}

export function ConflictList({ conflicts }: ConflictListProps) {
  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Active Conflicts</h2>
        </div>
        <div className="flex items-center gap-1.5 text-warning">
          <AlertTriangle className="w-3 h-3" />
          <span className="font-mono text-xs">{conflicts.length}</span>
        </div>
      </div>

      {/* Conflict Cards */}
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {conflicts.map((conflict) => (
          <div 
            key={conflict.id}
            className="p-3 border-l border-warning transition-default hover:bg-secondary/50"
            style={{ background: 'hsl(0 0% 5%)' }}
          >
            {/* Teams */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-text-secondary font-medium">{conflict.team1}</span>
              <span className="text-text-hint">vs</span>
              <span className="text-text-secondary font-medium">{conflict.team2}</span>
            </div>

            {/* Topic */}
            <p className="text-[11px] text-text-tertiary mt-1.5">
              {conflict.topic}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-warning">
                Severity: {conflict.severity}
              </span>
              <span className="text-[10px] text-text-muted">
                {conflict.timeAgo}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
