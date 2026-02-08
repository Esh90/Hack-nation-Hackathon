import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conflict } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

type StatusFilter = "all" | "ongoing" | "resolved";

interface ConflictListProps {
  conflicts: Conflict[];
}

export function ConflictList({ conflicts }: ConflictListProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const severityColors = {
    low: "#6b7280",
    medium: "#f59e0b",
    high: "#ef4444",
  };

  // Light theme background colors for conflict cards
  const lightSeverityBgColors = {
    low: "#f3f4f6", // Light gray
    medium: "#fef3c7", // Light yellow/amber
    high: "#fee2e2", // Light red
  };

  const activeCount = conflicts.filter((c) => c.status === "ongoing" || c.status === "escalated").length;
  const resolvedCount = conflicts.filter((c) => c.status === "resolved").length;

  const filteredConflicts =
    statusFilter === "all"
      ? conflicts
      : statusFilter === "ongoing"
        ? conflicts.filter((c) => c.status === "ongoing" || c.status === "escalated")
        : conflicts.filter((c) => c.status === "resolved");

  const filterLabel =
    statusFilter === "all"
      ? `All (${conflicts.length})`
      : statusFilter === "ongoing"
        ? `Active (${activeCount})`
        : `Resolved (${resolvedCount})`;

  return (
    <div className="h-full flex flex-col panel min-h-0">
      {/* Header with dropdown */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Conflicts</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted">
            {activeCount} active · {resolvedCount} resolved
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-default">
                {filterLabel}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All ({conflicts.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("ongoing")}>
                Active ({activeCount})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("resolved")}>
                Resolved ({resolvedCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Conflict Cards - minimized by default, expand on click */}
      <div className="flex-1 overflow-auto p-2 space-y-1 min-h-0">
        {filteredConflicts.map((conflict, index) => {
          const isExpanded = expandedId === conflict.id;
          return (
            <motion.div
              key={conflict.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="transition-default cursor-pointer border-l-2"
              style={{
                background: isDark ? "hsl(0 0% 5%)" : lightSeverityBgColors[conflict.severity],
                borderLeftColor: severityColors[conflict.severity],
              }}
              onClick={() => setExpandedId(isExpanded ? null : conflict.id)}
            >
              {/* Minimized row - always visible */}
              <div className="p-2 flex items-center gap-2 hover:bg-secondary/30">
                <motion.div
                  animate={{ rotate: isExpanded ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
                </motion.div>
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-[11px] text-text-secondary font-medium truncate" title={`${conflict.team1} vs ${conflict.team2}`}>
                    {conflict.team1} vs {conflict.team2}
                  </span>
                  <span className="text-[10px] text-text-hint">·</span>
                  <span className="text-[10px] text-text-tertiary truncate">
                    {conflict.topic}
                  </span>
                </div>
                <span
                  className="text-[9px] font-medium uppercase shrink-0 px-1.5 py-0.5"
                  style={{
                    color: severityColors[conflict.severity],
                    background: `${severityColors[conflict.severity]}20`,
                  }}
                >
                  {conflict.severity}
                </span>
                {conflict.status === "ongoing" || conflict.status === "escalated" ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-warning shrink-0" />
                ) : null}
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="px-2 pb-2 pt-0 pl-7 border-t border-border/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <p className="text-[11px] text-text-secondary leading-relaxed mt-2">
                        {conflict.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <span
                          className="text-[10px] font-medium uppercase"
                          style={{ color: severityColors[conflict.severity] }}
                        >
                          {conflict.status === "resolved" ? "Resolved" : conflict.status || "Ongoing"}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {formatDistanceToNow(conflict.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
