import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, AlertTriangle, Send, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Conflict } from "@/lib/api";
import type { CriticContradiction } from "@/lib/api";
import { analyzeWithCritic } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

type StatusFilter = "all" | "ongoing" | "resolved";

interface ConflictListProps {
  conflicts: Conflict[];
}

export function ConflictList({ conflicts }: ConflictListProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [criticOpen, setCriticOpen] = useState(false);
  const [criticInput, setCriticInput] = useState("");
  const [criticLoading, setCriticLoading] = useState(false);
  const [criticResult, setCriticResult] = useState<{
    contradictions: CriticContradiction[];
    recommendation: string;
  } | null>(null);

  const severityColors = {
    low: "#6b7280",
    medium: "#f59e0b",
    high: "#ef4444",
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

  const runCritic = async () => {
    const text = criticInput.trim();
    if (text.length < 5) return;
    setCriticLoading(true);
    setCriticResult(null);
    try {
      const res = await analyzeWithCritic(text);
      setCriticResult({
        contradictions: res.contradictions ?? [],
        recommendation: res.recommendation ?? "",
      });
    } catch {
      setCriticResult({ contradictions: [], recommendation: "Analysis failed." });
    } finally {
      setCriticLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col panel min-h-0">
      {/* Deconfliction: Check new info with Critic */}
      <div className="px-2 pt-1.5 pb-1 border-b border-border flex items-center justify-between gap-2 flex-wrap">
        <Link
          to="/critic"
          className="text-[10px] text-info hover:text-primary transition-default flex items-center gap-1"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Check new info with Critic
        </Link>
        <button
          type="button"
          onClick={() => setCriticOpen(!criticOpen)}
          className="text-[10px] text-text-tertiary hover:text-text-secondary"
        >
          {criticOpen ? "Hide quick check" : "Quick check"}
        </button>
      </div>
      {criticOpen && (
        <div className="p-2 border-b border-border space-y-2 bg-background/50">
          <textarea
            value={criticInput}
            onChange={(e) => setCriticInput(e.target.value)}
            placeholder="Paste meeting note or new info..."
            className="w-full min-h-[60px] px-2 py-1.5 text-[11px] bg-background border border-border rounded text-foreground placeholder:text-text-muted resize-y"
            disabled={criticLoading}
          />
          <button
            type="button"
            onClick={runCritic}
            disabled={criticLoading || criticInput.trim().length < 5}
            className="flex items-center gap-1.5 px-2 py-1 text-[11px] bg-info/20 text-info border border-info/50 rounded hover:bg-info/30 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {criticLoading ? "Checking…" : "Check with Critic"}
          </button>
          {criticResult && (
            <div className="space-y-2">
              {criticResult.contradictions.length > 0 ? (
                <>
                  <p className="text-[10px] font-medium text-warning">Contradictions</p>
                  {criticResult.contradictions.map((c, i) => (
                    <div
                      key={i}
                      className="p-2 rounded border border-warning/30 bg-warning/5 text-[10px] space-y-1"
                    >
                      <p className="text-text-secondary">{c.description ?? `${c.source_new} vs ${c.source_kg}`}</p>
                      {(c.parties_to_notify?.length ?? 0) > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Bell className="w-3 h-3 text-info shrink-0" />
                          <span className="text-text-muted">Notify: </span>
                          <span className="text-info">{c.parties_to_notify!.join(", ")}</span>
                          <button
                            type="button"
                            className="ml-1 px-1.5 py-0.5 rounded border border-info/50 text-info hover:bg-info/20 text-[9px]"
                          >
                            Notify
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="text-[10px] text-text-muted">{criticResult.recommendation}</p>
                </>
              ) : (
                <p className="text-[10px] text-success">No contradictions found.</p>
              )}
            </div>
          )}
        </div>
      )}

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
              className="transition-default cursor-pointer"
              style={{
                background: "hsl(0 0% 5%)",
                borderLeft: `2px solid ${severityColors[conflict.severity]}`,
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
                  <span className="text-[11px] text-text-secondary font-medium truncate">
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
