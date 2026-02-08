import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { Decision, GraphNode, GraphEdge, Conflict } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

interface DecisionStreamProps {
  decisions: Decision[];
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  conflicts?: Conflict[];
}

function getTeams(nodes: GraphNode[], conflicts: Conflict[]): string[] {
  const teams = new Set<string>();
  nodes.forEach((n) => {
    if (n.team) teams.add(n.team);
  });
  conflicts.forEach((c) => {
    if (c.team1) teams.add(c.team1);
    if (c.team2) teams.add(c.team2);
  });
  return Array.from(teams).sort();
}

/** Who needs to know: stakeholders connected to this decision in the graph */
function getWhoNeedsToKnow(decision: Decision, nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const idToLabel = new Map(nodes.map((n) => [n.id, n.label]));
  const decisionNode = nodes.find(
    (n) =>
      n.label === decision.title ||
      n.id === decision.id ||
      (n.type === "decision" && n.label?.toLowerCase() === decision.title?.toLowerCase())
  );
  if (!decisionNode) return [];
  const ids = new Set<string>();
  edges.forEach((e) => {
    if (e.source === decisionNode.id) ids.add(e.target);
    if (e.target === decisionNode.id) ids.add(e.source);
  });
  return [...ids].map((id) => idToLabel.get(id) ?? id).filter(Boolean);
}

export function DecisionStream({
  decisions,
  nodes = [],
  edges = [],
  conflicts = [],
}: DecisionStreamProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notifiedDecisions, setNotifiedDecisions] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const teams = getTeams(nodes, conflicts);

  const statusColors = {
    new: '#10b981',
    updated: '#3b82f6',
    old: '#6b7280',
  };

  const playAudioSfx = (type: string) => {
    // Implement your audio SFX playback here
    console.log('Play SFX:', type);
  };

  return (
    <div className="h-full flex flex-col panel min-h-0">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Decision Stream</h2>
          <p className="text-[11px] text-text-muted">Versioned organizational truth</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              onClick={() => playAudioSfx('tab')}
              className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-text-secondary transition-default"
            >
              All Teams
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[160px]">
            <DropdownMenuItem onClick={() => playAudioSfx('tab')}>
              All Teams
            </DropdownMenuItem>
            {teams.map((team) => (
              <DropdownMenuItem
                key={team}
                onClick={() => {
                  playAudioSfx('tab');
                  navigate(`/team/${encodeURIComponent(team)}`);
                }}
              >
                {team}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-auto p-2 min-h-0">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-2">
            {decisions.map((decision, index) => (
              <motion.div
                key={decision.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-12"
              >
                {/* Timeline node */}
                <div
                  className="absolute left-[15px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-background z-10"
                  style={{
                    backgroundColor: statusColors[decision.status],
                    boxShadow:
                      decision.status === 'new'
                        ? `0 0 12px ${statusColors[decision.status]}`
                        : 'none',
                  }}
                >
                  {decision.status === 'new' && (
                    <motion.div
                      animate={{ scale: [1, 1.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute inset-0 rounded-full"
                      style={{ backgroundColor: statusColors[decision.status] }}
                    />
                  )}
                </div>

                {/* Decision card */}
                <div
                  className="bg-card p-2.5 cursor-pointer hover:bg-secondary/50 transition-all border border-border"
                  onClick={() => {
                    playAudioSfx('soft');
                    setExpandedId(expandedId === decision.id ? null : decision.id);
                  }}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-text-tertiary px-2 py-0.5 bg-secondary">
                        v{decision.version}
                      </span>
                      <h3 className="text-sm font-medium text-text-primary">
                        {decision.title}
                      </h3>
                    </div>
                    <motion.div
                      animate={{ rotate: expandedId === decision.id ? 90 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronRight className="w-4 h-4 text-text-tertiary" />
                    </motion.div>
                  </div>

                  <div className="text-[11px] text-text-muted mb-1">
                    by {decision.author} •{' '}
                    {formatDistanceToNow(decision.timestamp, { addSuffix: true })}
                  </div>

                  <div className="text-[10px] text-success mb-1">↗ {decision.change}</div>

                  <AnimatePresence>
                    {expandedId === decision.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 pt-2 border-t border-border space-y-2">
                          {(() => {
                            const who = getWhoNeedsToKnow(decision, nodes, edges);
                            const notified = notifiedDecisions.has(decision.id);
                            return who.length > 0 ? (
                              <div>
                                <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">
                                  Who needs to know
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Bell className="w-3 h-3 text-info shrink-0" />
                                  <span className="text-[11px] text-text-secondary">
                                    {who.join(", ")}
                                  </span>
                                  {!notified ? (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNotifiedDecisions((s) => new Set(s).add(decision.id));
                                      }}
                                      className="px-2 py-0.5 text-[10px] rounded border border-info/50 text-info hover:bg-info/20"
                                    >
                                      Notify
                                    </button>
                                  ) : (
                                    <span className="text-[10px] text-success">Notified</span>
                                  )}
                                </div>
                              </div>
                            ) : null;
                          })()}
                          <div>
                            <div className="text-[10px] text-text-tertiary uppercase tracking-wide mb-1">
                              Reasoning
                            </div>
                            <div className="text-[11px] text-text-secondary leading-relaxed">
                              {decision.reasoning}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {expandedId !== decision.id && (
                    <div className="text-[10px] text-text-muted mt-2 hover:text-text-tertiary transition-colors">
                      View reasoning →
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
