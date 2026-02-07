import { useEffect, useState } from "react";
interface TopBarProps {
  healthScore: number;
  hasConflicts: boolean;
}
export function TopBar({
  healthScore,
  hasConflicts
}: TopBarProps) {
  const [timestamp, setTimestamp] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setTimestamp(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };
  return <header className="h-[60px] bg-background border-b border-border flex items-center justify-between px-6 shrink-0">
      {/* Logo Section */}
      <div className="flex flex-col justify-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">AxonAI</h1>
        <span className="text-[11px] text-text-muted -mt-0.5">
          Organizational Intelligence Layer
        </span>
      </div>

      {/* System Status */}
      <div className="flex items-center gap-6">
        {/* Health Indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${hasConflicts ? 'bg-warning animate-pulse-slow' : 'bg-success animate-pulse-slow'}`} />
            <span className="font-mono text-xs text-text-secondary">
              System Health: <span className={hasConflicts ? 'text-warning' : 'text-success'}>{healthScore}%</span>
            </span>
          </div>
        </div>

        {/* Timestamp */}
        <div className="flex flex-col items-end">
          <span className="font-mono text-xs text-text-muted">
            {formatTime(timestamp)}
          </span>
          <span className="font-mono text-[10px] text-text-hint">
            {formatDate(timestamp)}
          </span>
        </div>
      </div>
    </header>;
}