interface HealthDisplayProps {
  score: number;
}

export function HealthDisplay({ score }: HealthDisplayProps) {
  const barHeights = [40, 65, 45, 70, 55];

  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">System Health</h2>
          <p className="text-[11px] text-text-muted">Real-time conflict detection</p>
        </div>
      </div>

      {/* Score Display */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div 
          className="font-mono text-6xl font-light"
          style={{
            background: 'linear-gradient(180deg, hsl(160 84% 39%) 0%, hsl(160 72% 52%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {score}%
        </div>
        <span className="text-[10px] uppercase tracking-[1.5px] text-text-muted mt-2">
          Organizational Health Score
        </span>

        {/* Heartbeat Visualization */}
        <div 
          className="w-full h-[120px] mt-6 flex items-end justify-center gap-3"
          style={{ background: 'hsl(0 0% 3%)' }}
        >
          {barHeights.map((height, i) => (
            <div
              key={i}
              className="w-0.5 bg-success/60 glow-success animate-bar-pulse"
              style={{ 
                height: `${height}px`,
                animationDelay: `${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
