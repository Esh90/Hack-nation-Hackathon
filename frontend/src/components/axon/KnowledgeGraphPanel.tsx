import { useState } from "react";
import KnowledgeGraph from './KnowledgeGraph';
import type { GraphNode, GraphEdge } from "@/lib/api";
import type { ChangesToday } from "@/lib/api";
import { X, ChevronDown, ChevronRight } from "lucide-react";

interface KnowledgeGraphPanelProps {
  nodeCount?: number;
  connectionCount?: number;
  nodes?: GraphNode[];
  edges?: GraphEdge[];
  highlightedNodeIds?: string[];
  changesToday?: ChangesToday | null;
  onClearChanges?: () => void;
  onPersonClick?: (personId: string) => void;
}

export function KnowledgeGraphPanel({ 
  nodeCount, 
  connectionCount,
  nodes,
  edges,
  highlightedNodeIds = [],
  changesToday = null,
  onClearChanges,
  onPersonClick,
}: KnowledgeGraphPanelProps) {
  const [changesStripOpen, setChangesStripOpen] = useState(true);
  const legendItems = [
    { color: 'bg-success', label: 'Active' },
    { color: 'bg-warning', label: 'Aging' },
    { color: 'bg-error', label: 'Conflicted' },
    { color: 'bg-text-hint opacity-40', label: 'Stale' },
  ];

  return (
    <div className="h-full flex flex-col panel min-h-0">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Knowledge Map</h2>
          <p className="text-[11px] text-text-muted">Live organizational structure</p>
        </div>
        <span className="font-mono text-[10px] text-text-tertiary">
          {nodeCount || nodes?.length || 0} nodes • {connectionCount || edges?.length || 0} connections
        </span>
      </div>

      {/* Today's changes strip (when "What changed today?" was used) */}
      {changesToday && (
        <div className="shrink-0 border-b border-[#1a1a1a] bg-[#0f0f0f]">
          <button
            type="button"
            onClick={() => setChangesStripOpen(!changesStripOpen)}
            className="w-full px-2 py-1.5 flex items-center gap-2 text-left hover:bg-[#151515] transition-colors"
          >
            {changesStripOpen ? (
              <ChevronDown className="w-3.5 h-3.5 text-info" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-info" />
            )}
            <span className="text-[10px] font-medium text-info">Today&apos;s changes</span>
            {onClearChanges && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClearChanges(); }}
                className="ml-auto p-1 rounded hover:bg-[#1a1a1a] text-text-muted hover:text-foreground"
                title="Clear highlight"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </button>
          {changesStripOpen && (
            <div className="px-2 pb-2 pt-0 space-y-1.5 text-[10px] text-text-secondary max-h-24 overflow-auto">
              <p className="text-text-muted">{changesToday.narrative_summary}</p>
              {changesToday.recent_decisions.length > 0 && (
                <div>
                  <span className="text-text-tertiary font-medium">Recent decisions: </span>
                  {changesToday.recent_decisions.slice(0, 5).map((d) => d.title).filter(Boolean).join(", ") || "—"}
                </div>
              )}
              {changesToday.ongoing_conflicts.length > 0 && (
                <div>
                  <span className="text-text-tertiary font-medium">Ongoing conflicts: </span>
                  {changesToday.ongoing_conflicts
                    .map((c) => c.topic || `${c.team1} vs ${c.team2}`)
                    .filter(Boolean)
                    .slice(0, 5)
                    .join(", ") || String(changesToday.ongoing_conflicts.length)}
                </div>
              )}
              {changesToday.recent_conflicts?.length > 0 && (
                <div>
                  <span className="text-text-tertiary font-medium">New today: </span>
                  {changesToday.recent_conflicts
                    .map((c) => c.topic || `${c.team1} vs ${c.team2}`)
                    .filter(Boolean)
                    .join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Graph Area */}
      <div 
        className="flex-1 relative grid-pattern min-h-0"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(0 0% 6%) 0%, hsl(0 0% 3%) 100%)'
        }}
      >
        {nodes && edges ? (
          <KnowledgeGraph 
            nodes={nodes} 
            edges={edges} 
            nodeCount={nodes.length}
            highlightedNodeIds={highlightedNodeIds}
            onPersonClick={onPersonClick}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-text-hint text-sm">Graph initializing...</span>
            <div className="mt-4 w-8 h-8 rounded-full bg-text-hint/20 animate-fade-pulse" />
          </div>
        )}
      </div>

      {/* Bottom section: Node Status + Edge types + insight strip */}
      <div className="shrink-0 flex flex-col gap-1.5 px-2 py-2 border-t border-[#1a1a1a] bg-[#0a0a0a]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-2 py-1.5 border border-[#1a1a1a] bg-[#0f0f0f]">
            <h3 className="text-[9px] uppercase tracking-widest text-text-tertiary">
              Node Status
            </h3>
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${item.color}`} />
                <span className="text-[10px] text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 px-2 py-1.5 border border-[#1a1a1a] bg-[#0f0f0f]">
            <h3 className="text-[9px] uppercase tracking-widest text-text-tertiary">
              Edges
            </h3>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: '#3b82f6' }} />
              <span className="text-[10px] text-text-secondary">influences</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: '#8b5cf6' }} />
              <span className="text-[10px] text-text-secondary">depends on</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-0.5 rounded" style={{ backgroundColor: '#ef4444' }} />
              <span className="text-[10px] text-text-secondary">conflicts</span>
            </div>
          </div>
        </div>
        {nodes && edges && (() => {
          const conflictCount = edges.filter((e) => e.type === 'conflicts_with').length;
          const highImpact = nodes.filter((n) => (n.centrality ?? 0) >= 0.7 && n.type === 'decision').length;
          const activeCount = nodes.filter((n) => n.status === 'active').length;
          const parts = [];
          if (conflictCount > 0) parts.push(`${conflictCount} conflict${conflictCount !== 1 ? 's' : ''}`);
          if (highImpact > 0) parts.push(`${highImpact} high-impact decision${highImpact !== 1 ? 's' : ''}`);
          if (activeCount > 0) parts.push(`${activeCount} active`);
          if (parts.length === 0) return null;
          return (
            <p className="text-[10px] text-text-tertiary">
              {parts.join(' · ')}
            </p>
          );
        })()}
      </div>
    </div>
  );
}