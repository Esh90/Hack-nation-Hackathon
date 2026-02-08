import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

interface TopBarProps {
  healthScore: number;
  hasConflicts: boolean;
}

export function TopBar({
  healthScore,
  hasConflicts
}: TopBarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
          className="text-[11px] text-white font-medium hover:opacity-90 transition-default px-2 py-1 border-2 rounded"
          style={{
            borderColor: isDark ? '#10b981' : '#059669',
            backgroundColor: isDark ? '#10b981' : '#10b981'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? '#059669' : '#059669';
            e.currentTarget.style.borderColor = isDark ? '#059669' : '#047857';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? '#10b981' : '#10b981';
            e.currentTarget.style.borderColor = isDark ? '#10b981' : '#059669';
          }}
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

        {/* Theme Toggle */}
        <ThemeToggle />

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