import { useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopBar } from "@/components/axon/TopBar";
import { KnowledgeGraphPanel } from "@/components/axon/KnowledgeGraphPanel";
import { HealthDisplay } from "@/components/axon/HealthDisplay";
import { ConflictList } from "@/components/axon/ConflictList";
import { DecisionStream } from "@/components/axon/DecisionStream";
import { ShadowCouncil } from "@/components/axon/ShadowCouncil";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
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
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen w-full max-w-[100vw] flex flex-col bg-background overflow-x-hidden">
      {/* Top Bar */}
      <TopBar healthScore={healthScore} hasConflicts={hasConflicts} />

      {/* Main Content - Scrollable */}
      <div className="flex-1 relative pb-14 min-h-0 overflow-auto scrollbar-thin">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-error/20 border border-error/50 text-error text-sm rounded shadow-lg">
            {error} — Ensure backend is running on port 8000
          </div>
        )}
        {loading ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="text-text-muted text-sm">Loading...</div>
          </div>
        ) : (
          <ResizablePanelGroup
            direction={isMobile ? "vertical" : "horizontal"}
            className="min-h-[calc(100vh-7.5rem)] max-h-[calc(100vh-4rem)]"
          >
            {/* Left Panel - Knowledge Graph (Resizable) */}
            <ResizablePanel
              defaultSize={40}
              minSize={20}
              maxSize={60}
              className="min-w-0"
            >
              <div className="h-full overflow-auto scrollbar-thin">
                <KnowledgeGraphPanel
                  nodes={graphData?.nodes ?? []}
                  edges={graphData?.edges ?? []}
                  nodeCount={graphData?.nodes.length ?? 0}
                  connectionCount={graphData?.edges.length ?? 0}
                />
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border hover:bg-border-subtle" />

            {/* Middle Panel - Conflict Monitor (Resizable, vertical split) */}
            <ResizablePanel
              defaultSize={30}
              minSize={20}
              maxSize={50}
              className="min-w-0"
            >
              <ResizablePanelGroup direction="vertical" className="h-full">
                <ResizablePanel defaultSize={40} minSize={15} maxSize={70}>
                  <div className="h-full overflow-auto scrollbar-thin">
                    <HealthDisplay score={healthScore} />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-border hover:bg-border-subtle" />
                <ResizablePanel defaultSize={60} minSize={30} maxSize={85}>
                  <div className="h-full overflow-auto scrollbar-thin">
                    <ConflictList conflicts={conflicts} />
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>

            <ResizableHandle withHandle className="bg-border hover:bg-border-subtle" />

            {/* Right Panel - Decision Stream (Resizable) */}
            <ResizablePanel
              defaultSize={30}
              minSize={20}
              maxSize={50}
              className="min-w-0"
            >
              <div className="h-full overflow-auto scrollbar-thin">
                <DecisionStream
                  decisions={decisions}
                  nodes={graphData?.nodes ?? []}
                  conflicts={conflicts}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Shadow Council - Fixed at bottom */}
      <ShadowCouncil />
    </div>
  );
}
