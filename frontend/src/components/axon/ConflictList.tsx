import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { Conflict } from '@/lib/synthetic-data';
import { formatDistanceToNow } from 'date-fns';

interface ConflictListProps {
  conflicts: Conflict[];
}

export function ConflictList({ conflicts }: ConflictListProps) {
  const severityColors = {
    low: '#6b7280',
    medium: '#f59e0b',
    high: '#ef4444'
  };

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
        {conflicts.map((conflict, index) => (
          <motion.div
            key={conflict.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-3 border-l-2 transition-default hover:bg-secondary/50 cursor-pointer"
            style={{ 
              background: 'hsl(0 0% 5%)',
              borderLeftColor: severityColors[conflict.severity]
            }}
          >
            {/* Teams */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-text-secondary font-medium">{conflict.team1}</span>
                <span className="text-[10px] text-text-hint">vs</span>
                <span className="text-xs text-text-secondary font-medium">{conflict.team2}</span>
              </div>
              <AlertTriangle 
                className="w-3 h-3" 
                style={{ color: severityColors[conflict.severity] }}
              />
            </div>

            {/* Topic */}
            <p className="text-[11px] text-text-tertiary mb-2">
              {conflict.topic}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span 
                className="text-[10px] font-medium uppercase"
                style={{ color: severityColors[conflict.severity] }}
              >
                Severity: {conflict.severity}
              </span>
              <span className="text-[10px] text-text-muted">
                {formatDistanceToNow(conflict.timestamp, { addSuffix: true })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
