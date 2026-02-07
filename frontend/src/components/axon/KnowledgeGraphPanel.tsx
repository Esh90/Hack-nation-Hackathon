interface KnowledgeGraphPanelProps {
  nodeCount: number;
  connectionCount: number;
}

export function KnowledgeGraphPanel({ nodeCount, connectionCount }: KnowledgeGraphPanelProps) {
  const legendItems = [
    { color: 'bg-success', label: 'Active' },
    { color: 'bg-warning', label: 'Aging' },
    { color: 'bg-error', label: 'Conflicted' },
    { color: 'bg-text-hint opacity-40', label: 'Stale' },
  ];

  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">Knowledge Map</h2>
          <p className="text-[11px] text-text-muted">Live organizational structure</p>
        </div>
        <span className="font-mono text-[10px] text-text-tertiary">
          {nodeCount} nodes • {connectionCount.toLocaleString()} connections
        </span>
      </div>

      {/* Graph Area */}
      <div 
        className="flex-1 relative grid-pattern"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(0 0% 6%) 0%, hsl(0 0% 3%) 100%)'
        }}
      >
        {/* Placeholder */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-text-hint text-sm">Graph initializing...</span>
          <div className="mt-4 w-8 h-8 rounded-full bg-text-hint/20 animate-fade-pulse" />
        </div>

        {/* Legend */}
        <div 
          className="absolute bottom-4 left-4 w-[200px] p-3 backdrop-blur-panel border border-border"
          style={{ background: 'hsla(0, 0%, 6%, 0.95)' }}
        >
          <h3 className="text-[10px] uppercase tracking-widest text-text-tertiary mb-3">
            Node Status
          </h3>
          <div className="space-y-2">
            {legendItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-xs text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
