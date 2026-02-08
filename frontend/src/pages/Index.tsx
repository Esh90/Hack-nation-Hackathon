import { useEffect, useState } from "react";
import { TopBar } from "@/components/axon/TopBar";
import { KnowledgeGraphPanel } from "@/components/axon/KnowledgeGraphPanel";
import { HealthDisplay } from "@/components/axon/HealthDisplay";
import { ConflictList } from "@/components/axon/ConflictList";
import { DecisionStream } from "@/components/axon/DecisionStream";
import { ShadowCouncil } from "@/components/axon/ShadowCouncil";
import {
  fetchGraphData,
  fetchConflicts,
  fetchDecisions,
  fetchHealthScore,
} from "@/lib/api";
import type { GraphNode, GraphEdge, Conflict, Decision } from "@/lib/api";

export default function Index() {
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
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
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load data");
        setGraphData({ nodes: [], edges: [] });
        setConflicts([]);
        setDecisions([]);
        setHealthScore(100);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasConflicts = conflicts.length > 0;

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar healthScore={healthScore} hasConflicts={hasConflicts} />

      {/* Main Content */}
      <div className="flex-1 relative pb-14 min-h-0">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-error/20 border border-error/50 text-error text-sm rounded">
            {error} — Ensure backend is running on port 8000
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-text-muted text-sm">Loading...</div>
          </div>
        ) : (
          <div
            className="h-[calc(100vh-44px-56px)] grid gap-px bg-border overflow-hidden"
            style={{ gridTemplateColumns: "40% 30% 30%" }}
          >
            {/* Left Panel - Knowledge Graph */}
            <KnowledgeGraphPanel
              nodes={graphData?.nodes ?? []}
              edges={graphData?.edges ?? []}
              nodeCount={graphData?.nodes.length ?? 0}
              connectionCount={graphData?.edges.length ?? 0}
            />

            {/* Middle Panel - Conflict Monitor (Split) */}
            <div className="grid grid-rows-2 gap-px bg-border min-h-0">
              <HealthDisplay score={healthScore} />
              <ConflictList conflicts={conflicts} />
            </div>

            {/* Right Panel - Decision Stream */}
            <DecisionStream
              decisions={decisions}
              nodes={graphData?.nodes ?? []}
              conflicts={conflicts}
            />
          </div>
        )}
      </div>

      {/* Shadow Council - Fixed at bottom */}
      <ShadowCouncil />
    </div>
  );
}
