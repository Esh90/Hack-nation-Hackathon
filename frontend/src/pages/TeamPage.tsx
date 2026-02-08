import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import {
  fetchGraphData,
  fetchConflicts,
  fetchDecisions,
  fetchHealthScore,
  playAudioSfx,
} from "@/lib/api";
import type { GraphNode, GraphEdge, Conflict, Decision } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function TeamPage() {
  const { teamName } = useParams<{ teamName: string }>();
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [graphRes, conflictsRes, decisionsRes, healthRes] =
          await Promise.all([
            fetchGraphData(),
            fetchConflicts(),
            fetchDecisions(),
            fetchHealthScore(),
          ]);
        setGraphData(graphRes);
        setConflicts(conflictsRes);
        setDecisions(decisionsRes);
        setHealthScore(healthRes.score);
      } catch {
        setGraphData({ nodes: [], edges: [] });
        setConflicts([]);
        setDecisions([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const team = teamName ? decodeURIComponent(teamName) : null;
  if (!team) return null;

  const personLabels = new Set(
    (graphData?.nodes ?? [])
      .filter((n) => n.team === team)
      .map((n) => n.label)
  );

  const teamDecisions = decisions.filter((d) => personLabels.has(d.author));
  const teamConflicts = conflicts.filter(
    (c) => c.team1 === team || c.team2 === team
  );
  const teamMembers = (graphData?.nodes ?? []).filter(
    (n) => n.type === "person" && n.team === team
  );
  const teamEdges = (graphData?.edges ?? []).filter(
    (e) =>
      teamMembers.some((m) => m.id === e.source || m.id === e.target)
  );

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border px-4 py-2 flex items-center gap-3">
        <button
          onClick={() => {
            playAudioSfx("tab");
            navigate("/");
          }}
          className="p-2 rounded border border-border hover:bg-secondary/50 transition-default text-text-secondary"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-medium text-foreground">{team}</h1>
          <p className="text-[11px] text-text-muted">Team overview & stats</p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-text-muted text-sm">Loading...</span>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Stats cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-2xl font-mono text-foreground">
                  {teamMembers.length}
                </div>
                <div className="text-[11px] text-text-muted uppercase tracking-wide">
                  Members
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-2xl font-mono text-foreground">
                  {teamDecisions.length}
                </div>
                <div className="text-[11px] text-text-muted uppercase tracking-wide">
                  Decisions
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-2xl font-mono text-warning">
                  {teamConflicts.length}
                </div>
                <div className="text-[11px] text-text-muted uppercase tracking-wide">
                  Conflicts
                </div>
              </div>
              <div className="p-3 rounded-lg border border-border bg-card">
                <div className="text-2xl font-mono text-success">
                  {teamEdges.length}
                </div>
                <div className="text-[11px] text-text-muted uppercase tracking-wide">
                  Connections
                </div>
              </div>
            </div>

            {/* Members */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <h2 className="text-sm font-medium text-foreground">Members</h2>
              </div>
              <div className="p-4">
                {teamMembers.length === 0 ? (
                  <p className="text-[11px] text-text-muted">
                    No members found for this team.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {teamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-3 p-2 rounded border border-border/50"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                          {m.label.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm text-foreground">
                            {m.label}
                          </div>
                          {m.reasoning && (
                            <div className="text-[10px] text-text-muted">
                              {m.reasoning}
                            </div>
                          )}
                        </div>
                        <span className="ml-auto text-[10px] text-text-tertiary capitalize">
                          {m.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Decisions */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <h2 className="text-sm font-medium text-foreground">
                  Decisions by {team}
                </h2>
              </div>
              <div className="p-4">
                {teamDecisions.length === 0 ? (
                  <p className="text-[11px] text-text-muted">
                    No decisions from this team.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamDecisions.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 rounded border border-border bg-background"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-mono text-text-tertiary">
                            v{d.version}
                          </span>
                          <span className="text-sm font-medium text-foreground">
                            {d.title}
                          </span>
                        </div>
                        <div className="text-[11px] text-text-muted">
                          by {d.author} •{" "}
                          {formatDistanceToNow(d.timestamp, { addSuffix: true })}
                        </div>
                        {d.reasoning && (
                          <div className="text-[11px] text-text-secondary mt-2">
                            {d.reasoning}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Conflicts */}
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-secondary/30">
                <h2 className="text-sm font-medium text-foreground">
                  Conflicts involving {team}
                </h2>
              </div>
              <div className="p-4">
                {teamConflicts.length === 0 ? (
                  <p className="text-[11px] text-text-muted">
                    No conflicts for this team.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {teamConflicts.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 rounded border-l-2 border-warning/50 bg-warning/5"
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-foreground">{c.team1}</span>
                          <span className="text-text-muted">vs</span>
                          <span className="text-foreground">{c.team2}</span>
                        </div>
                        <div className="text-[11px] text-text-secondary mt-1">
                          {c.topic}
                        </div>
                        <div className="text-[10px] text-text-muted mt-1">
                          Severity: {c.severity} • {c.description}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
