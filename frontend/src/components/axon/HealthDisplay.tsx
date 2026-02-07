import ConflictHeartbeat from './ConflictHeartbeat';

interface HealthDisplayProps {
  score?: number;
}

export function HealthDisplay({ score }: HealthDisplayProps) {
  return (
    <div className="h-full flex flex-col panel">
      {/* Header */}
      <div className="panel-header">
        <div>
          <h2 className="text-sm font-medium text-foreground">System Health</h2>
          <p className="text-[11px] text-text-muted">Real-time conflict detection</p>
        </div>
      </div>

      {/* Heartbeat Component */}
      <div className="flex-1">
        <ConflictHeartbeat />
      </div>
    </div>
  );
}
