import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { TopBar } from "@/components/axon/TopBar";
import { KnowledgeGraphPanel } from "@/components/axon/KnowledgeGraphPanel";
import { HealthDisplay } from "@/components/axon/HealthDisplay";
import { ConflictList } from "@/components/axon/ConflictList";
import { DecisionStream } from "@/components/axon/DecisionStream";
import { ShadowCouncil } from "@/components/axon/ShadowCouncil";
import { AdminChat } from "@/components/axon/AdminChat";
import { DemoOverlay } from "@/components/axon/DemoOverlay";
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
  fetchChangesToday,
  fetchBrief,
} from "@/lib/api";
import type { GraphNode, GraphEdge, Conflict, Decision, ChangesToday, DailyBrief } from "@/lib/api";
import { Sparkles, FileText, AlertTriangle, MessageCircle, Play } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Index() {
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
  } | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [healthScore, setHealthScore] = useState<number>(100);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isAdminChatOpen, setIsAdminChatOpen] = useState(false);
  const [changesToday, setChangesToday] = useState<ChangesToday | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [loadingChanges, setLoadingChanges] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [briefData, setBriefData] = useState<DailyBrief | null>(null);
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  const loadData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /** Refetch all dashboard data (graph, conflicts, decisions, health) without full-page loading. */
  const refreshDashboard = useCallback(async () => {
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
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh");
    }
  }, []);

  const handleAdminGraphUpdated = useCallback(async () => {
    await refreshDashboard();
  }, [refreshDashboard]);

  const loadWhatChangedToday = useCallback(async () => {
    setLoadingChanges(true);
    try {
      const data = await fetchChangesToday();
      setChangesToday(data);
      setHighlightedNodeIds(data.node_ids_affected ?? []);
    } catch {
      setChangesToday(null);
      setHighlightedNodeIds([]);
    } finally {
      setLoadingChanges(false);
    }
  }, []);

  const clearChangesHighlight = useCallback(() => {
    setChangesToday(null);
    setHighlightedNodeIds([]);
  }, []);

  const loadBrief = useCallback(async () => {
    setLoadingBrief(true);
    try {
      const data = await fetchBrief();
      setBriefData(data);
      setBriefOpen(true);
    } catch {
      setBriefData(null);
    } finally {
      setLoadingBrief(false);
    }
  }, []);

  const hasConflicts = conflicts.length > 0;
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen w-full max-w-[100vw] flex flex-col bg-background overflow-x-hidden">
      {/* Top Bar */}
      <TopBar
        healthScore={healthScore}
        hasConflicts={hasConflicts}
        onDataUpdated={() => setRefreshTrigger((t) => t + 1)}
        onWhatChangedToday={loadWhatChangedToday}
        loadingChanges={loadingChanges}
        onMyBrief={loadBrief}
        loadingBrief={loadingBrief}
      />

      <Dialog open={briefOpen} onOpenChange={setBriefOpen}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              My brief
            </DialogTitle>
          </DialogHeader>
          {briefData && (
            <div className="space-y-4 text-sm">
              <p className="text-text-secondary leading-relaxed">{briefData.summary}</p>
              {briefData.conflicts_summary.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-warning font-medium mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    Conflicts
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-text-muted space-y-0.5">
                    {briefData.conflicts_summary.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {briefData.decisions_summary.length > 0 && (
                <div>
                  <div className="font-medium text-text-secondary mb-1">Recent decisions</div>
                  <ul className="list-disc list-inside text-[11px] text-text-muted space-y-0.5">
                    {briefData.decisions_summary.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}
              {briefData.talk_to.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 text-info font-medium mb-1">
                    <MessageCircle className="w-4 h-4" />
                    Talk to
                  </div>
                  <p className="text-[11px] text-text-muted">{briefData.talk_to.join(", ")}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                  highlightedNodeIds={highlightedNodeIds}
                  changesToday={changesToday}
                  onClearChanges={clearChangesHighlight}
                  onPersonClick={(id) => navigate(`/context/${id}`)}
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
                  edges={graphData?.edges ?? []}
                  conflicts={conflicts}
                />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
      </div>

      {/* Shadow Council - Fixed at bottom */}
      <ShadowCouncil />

      {/* Demo - floating button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="fixed bottom-[4.25rem] right-24 w-12 h-12 bg-primary/90 hover:bg-primary rounded-full flex items-center justify-center shadow-lg transition-all z-30 text-primary-foreground"
            aria-label="Start demo"
          >
            <Play className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          Guided demo (2 min)
        </TooltipContent>
      </Tooltip>

      {/* Admin: Live Knowledge Builder - floating button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsAdminChatOpen(true)}
            className="fixed bottom-[4.25rem] right-6 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transition-all z-30 text-white hover:scale-105 hover:shadow-emerald-500/25 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Chat with Admin"
          >
            <Sparkles className="w-6 h-6" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="font-medium">
          Chat with Admin · Live Knowledge Builder
        </TooltipContent>
      </Tooltip>

      <DemoOverlay open={demoOpen} onClose={() => setDemoOpen(false)} />

      <AdminChat
        isOpen={isAdminChatOpen}
        onClose={() => setIsAdminChatOpen(false)}
        onGraphUpdated={handleAdminGraphUpdated}
      />
    </div>
  );
}
