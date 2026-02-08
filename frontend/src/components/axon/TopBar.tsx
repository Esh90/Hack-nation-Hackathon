import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { playAudioSfx } from "@/lib/api";
import { DataSourceSheet } from "./DataSourceSheet";

interface TopBarProps {
  healthScore: number;
  hasConflicts: boolean;
  onDataUpdated?: () => void;
}

export function TopBar({
  healthScore,
  hasConflicts,
  onDataUpdated,
}: TopBarProps) {
  const [timestamp, setTimestamp] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTimestamp(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <header className="h-11 sm:h-12 bg-background border-b border-border flex items-center justify-between px-3 sm:px-4 shrink-0 min-w-0">
      {/* Logo Section */}
      <div className="flex items-center gap-4">
        <Link
          to="/"
          onClick={() => playAudioSfx("click")}
          className="flex flex-col justify-center hover:opacity-90 transition-opacity"
        >
          <h1 className="text-base font-semibold tracking-tight text-foreground">AxonAI</h1>
          <span className="text-[10px] text-text-muted -mt-0.5">
            Organizational Intelligence Layer
          </span>
        </Link>

        <Link
          to="/critic"
          onClick={() => playAudioSfx("click")}
          className="text-[11px] text-text-tertiary hover:text-primary transition-default px-2 py-1 border border-border hover:border-primary/50 rounded"
        >
          Critic Agent
        </Link>

        <DataSourceSheet onDataUpdated={onDataUpdated} />
      </div>

      {/* System Status - responsive */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Health Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${
              hasConflicts ? "bg-warning animate-pulse-slow" : "bg-success animate-pulse-slow"
            }`}
          />
          <span className="font-mono text-[10px] sm:text-xs text-text-secondary whitespace-nowrap">
            <span className="hidden sm:inline">System Health: </span>
            <span className={hasConflicts ? "text-warning" : "text-success"}>{healthScore}%</span>
          </span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Timestamp */}
        <div className="flex flex-col items-end">
          <span className="font-mono text-[10px] sm:text-xs text-text-muted">
            {formatTime(timestamp)}
          </span>
          <span className="font-mono text-[9px] sm:text-[10px] text-text-hint hidden sm:block">
            {formatDate(timestamp)}
          </span>
        </div>
      </div>
    </header>
  );
}
