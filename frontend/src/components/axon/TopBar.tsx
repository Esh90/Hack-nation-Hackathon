import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
  return <header className="h-11 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        <Link to="/" className="flex flex-col justify-center hover:opacity-90 transition-opacity">
          <h1 className="text-base font-semibold tracking-tight text-foreground">AxonAI</h1>
        <span className="text-[10px] text-text-muted -mt-0.5">
          Organizational Intelligence Layer
        </span>
        </Link>
        <Link
          to="/critic"
          className="text-[11px] text-text-tertiary hover:text-primary transition-default px-2 py-1 border border-border hover:border-primary/50 rounded"
        >
          Critic Agent
        </Link>
      </div>

      {/* System Status */}
        <div className="flex items-center gap-4">
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