import { TopBar } from "@/components/axon/TopBar";
import { KnowledgeGraphPanel } from "@/components/axon/KnowledgeGraphPanel";
import { HealthDisplay } from "@/components/axon/HealthDisplay";
import { ConflictList } from "@/components/axon/ConflictList";
import { DecisionStream } from "@/components/axon/DecisionStream";
import { ShadowCouncil } from "@/components/axon/ShadowCouncil";
import { 
  syntheticGraphData, 
  syntheticConflicts, 
  syntheticDecisions,
  calculateHealthScore 
} from '@/lib/synthetic-data';

export default function Index() {
  const healthScore = calculateHealthScore();
  const hasConflicts = syntheticConflicts.length > 0;

  return (
    <div className="min-h-screen w-screen flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar healthScore={healthScore} hasConflicts={hasConflicts} />

      {/* Main Content */}
      <div className="flex-1 relative pb-20">
        {/* Main Grid */}
        <div 
          className="min-h-[calc(100vh-60px-80px)] grid gap-px bg-border"
          style={{ 
            gridTemplateColumns: '40% 30% 30%',
          }}
        >
          {/* Left Panel - Knowledge Graph */}
          <KnowledgeGraphPanel 
            nodes={syntheticGraphData.nodes}
            edges={syntheticGraphData.edges}
            nodeCount={syntheticGraphData.nodes.length} 
            connectionCount={syntheticGraphData.edges.length} 
          />

          {/* Middle Panel - Conflict Monitor (Split) */}
          <div className="grid grid-rows-2 gap-px bg-border min-h-[600px]">
            <HealthDisplay score={healthScore} />
            <ConflictList conflicts={syntheticConflicts} />
          </div>

          {/* Right Panel - Decision Stream */}
          <DecisionStream decisions={syntheticDecisions} />
        </div>
      </div>

      {/* Shadow Council - Fixed at bottom */}
      <ShadowCouncil />
    </div>
  );
}
