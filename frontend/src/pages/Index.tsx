import { TopBar } from "@/components/axon/TopBar";
import { KnowledgeGraphPanel } from "@/components/axon/KnowledgeGraphPanel";
import { HealthDisplay } from "@/components/axon/HealthDisplay";
import { ConflictList, Conflict } from "@/components/axon/ConflictList";
import { DecisionStream, Decision } from "@/components/axon/DecisionStream";
import { ShadowCouncil } from "@/components/axon/ShadowCouncil";

// Placeholder data structures
const graphData = { nodes: [], edges: [] };

const conflicts: Conflict[] = [
  {
    id: '1',
    team1: 'Marketing',
    team2: 'Engineering',
    topic: 'Q1 Product Launch Timeline',
    severity: 'High',
    timeAgo: '2h ago',
  },
  {
    id: '2',
    team1: 'Sales',
    team2: 'Product',
    topic: 'Feature Prioritization Mismatch',
    severity: 'Medium',
    timeAgo: '5h ago',
  },
  {
    id: '3',
    team1: 'Design',
    team2: 'Engineering',
    topic: 'Component Library Standards',
    severity: 'Low',
    timeAgo: '1d ago',
  },
];

const decisions: Decision[] = [
  {
    id: '1',
    version: 3,
    title: 'Pricing Strategy Revision',
    author: 'Sarah Chen',
    timeAgo: '2 hours ago',
    previousVersion: 2,
    isNew: true,
  },
  {
    id: '2',
    version: 5,
    title: 'Remote Work Policy Update',
    author: 'Michael Ross',
    timeAgo: '4 hours ago',
    previousVersion: 4,
  },
  {
    id: '3',
    version: 2,
    title: 'Q1 OKR Alignment',
    author: 'Emily Wright',
    timeAgo: '1 day ago',
    previousVersion: 1,
  },
  {
    id: '4',
    version: 8,
    title: 'Security Protocol Enhancement',
    author: 'David Kim',
    timeAgo: '2 days ago',
  },
  {
    id: '5',
    version: 1,
    title: 'Customer Success Framework',
    author: 'Lisa Park',
    timeAgo: '3 days ago',
  },
];

const healthScore = 87;

export default function Index() {
  const hasConflicts = conflicts.length > 0;

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
            nodeCount={247} 
            connectionCount={1834} 
          />

          {/* Middle Panel - Conflict Monitor (Split) */}
          <div className="grid grid-rows-2 gap-px bg-border min-h-[600px]">
            <HealthDisplay score={healthScore} />
            <ConflictList conflicts={conflicts} />
          </div>

          {/* Right Panel - Decision Stream */}
          <DecisionStream decisions={decisions} />
        </div>
      </div>

      {/* Shadow Council - Fixed at bottom */}
      <ShadowCouncil />
    </div>
  );
}
