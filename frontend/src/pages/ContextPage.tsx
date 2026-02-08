import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, User, AlertTriangle, FileText, GitBranch } from "lucide-react";
import {
  fetchGraphData,
  fetchConflicts,
  fetchDecisions,
} from "@/lib/api";
import type { GraphNode, GraphEdge, Conflict, Decision } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

export default function ContextPage() {
  const { personId } = useParams<{ personId: string }>();
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [graphRes, conflictsRes, decisionsRes] = await Promise.all([
          fetchGraphData(),
          fetchConflicts(),
          fetchDecisions(),
        ]);
        setGraphData(graphRes);
        setConflicts(conflictsRes);
        setDecisions(decisionsRes);
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

  const node = (graphData?.nodes ?? []).find((n) => n.id === personId);
  const nodes = graphData?.nodes ?? [];
  const edges = graphData?.edges ?? [];
  const idToLabel = new Map(nodes.map((n) => [n.id, n.label]));

  const outEdges = edges.filter((e) => e.source === personId);
  const inEdges = edges.filter((e) => e.target === personId);
  const influences = outEdges.map((e) => ({ id: e.target, label: idToLabel.get(e.target) ?? e.target, type: e.type }));
  const influencedBy = inEdges.map((e) => ({ id: e.source, label: idToLabel.get(e.source) ?? e.source, type: e.type }));

  const personConflicts = conflicts.filter(
    (c) =>
      node &&
      (c.team1 === node.label ||
        c.team2 === node.label ||
        c.team1 === node.team ||
        c.team2 === node.team)
  );

  const relevantDecisions = decisions.filter(
    (d) =>
      node &&
      (d.author === node.label ||
        influences.some((i) => i.label === d.title) ||
        influencedBy.some((i) => i.label === d.title))
  );

  if (!personId) return null;

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      <header className="h-11 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-2 rounded border border-border hover:bg-secondary/50 transition-default text-text-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-semibold text-foreground">Context for {node?.label ?? personId}</h1>
            <span className="text-[10px] text-text-muted">Instant context view · New stakeholder</span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-text-muted text-sm">Loading…</div>
        ) : !node ? (
          <div className="py-12 text-center text-text-muted text-sm">Person not found.</div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-6">
            <section className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-info" />
                <h2 className="text-sm font-medium text-foreground">{node.label}</h2>
              </div>
              <p className="text-[11px] text-text-muted">
                {node.team && <span>Team: {node.team}</span>}
                {node.type && <span> · Type: {node.type}</span>}
              </p>
            </section>

            <section className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="w-4 h-4 text-info" />
                <h2 className="text-sm font-medium text-foreground">Connections</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                <div>
                  <p className="text-text-tertiary font-medium mb-1">Influences</p>
                  <ul className="space-y-0.5">
                    {influences.length === 0 ? (
                      <li className="text-text-muted">—</li>
                    ) : (
                      influences.map((i) => (
                        <li key={i.id}>
                          <span className="text-text-secondary">{i.label}</span>
                          <span className="text-text-muted"> ({i.type})</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
                <div>
                  <p className="text-text-tertiary font-medium mb-1">Influenced by</p>
                  <ul className="space-y-0.5">
                    {influencedBy.length === 0 ? (
                      <li className="text-text-muted">—</li>
                    ) : (
                      influencedBy.map((i) => (
                        <li key={i.id}>
                          <span className="text-text-secondary">{i.label}</span>
                          <span className="text-text-muted"> ({i.type})</span>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            </section>

            <section className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-warning" />
                <h2 className="text-sm font-medium text-foreground">Conflicts involving you</h2>
              </div>
              {personConflicts.length === 0 ? (
                <p className="text-[11px] text-text-muted">No conflicts.</p>
              ) : (
                <ul className="space-y-2">
                  {personConflicts.map((c) => (
                    <li
                      key={c.id}
                      className="p-2 rounded border border-border bg-background/50 text-[11px]"
                    >
                      <span className="text-text-secondary font-medium">{c.team1} vs {c.team2}</span>
                      <span className="text-text-muted"> · {c.topic}</span>
                      <p className="text-text-muted mt-0.5">{c.description}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="p-4 rounded-lg border border-border bg-card">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-info" />
                <h2 className="text-sm font-medium text-foreground">Decisions that affect you</h2>
              </div>
              {relevantDecisions.length === 0 ? (
                <p className="text-[11px] text-text-muted">No recent decisions.</p>
              ) : (
                <ul className="space-y-2">
                  {relevantDecisions.slice(0, 10).map((d) => (
                    <li
                      key={d.id}
                      className="p-2 rounded border border-border bg-background/50 text-[11px]"
                    >
                      <span className="text-text-secondary font-medium">{d.title}</span>
                      <span className="text-text-muted"> · by {d.author} · {formatDistanceToNow(d.timestamp, { addSuffix: true })}</span>
                      <p className="text-text-muted mt-0.5">{d.change}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
