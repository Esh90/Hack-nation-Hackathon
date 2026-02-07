export interface GraphNode {
  id: string;
  type: 'person' | 'decision' | 'topic';
  label: string;
  status: 'active' | 'aging' | 'conflicted' | 'stale';
  decay: number; // 0 to 1, where 1 = fully visible, 0 = invisible
  lastMentioned: Date;
  centrality: number; // 0 to 1, affects size
  team?: string;
  reasoning?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'influences' | 'depends_on' | 'conflicts_with';
  strength: number; // 0 to 1
}

export interface Conflict {
  id: string;
  team1: string;
  team2: string;
  topic: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  description: string;
}

export interface Decision {
  id: string;
  version: number;
  title: string;
  author: string;
  timestamp: Date;
  change: string;
  reasoning: string;
  status: 'new' | 'updated' | 'old';
}

// SYNTHETIC DATA - Replace this later with Member 3's API
export const syntheticGraphData = {
  nodes: [
    {
      id: 'n1',
      type: 'person' as const,
      label: 'Sarah Chen',
      status: 'active' as const,
      decay: 1.0,
      lastMentioned: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      centrality: 0.9,
      team: 'Product',
      reasoning: 'Key stakeholder in pricing decisions'
    },
    {
      id: 'n2',
      type: 'person' as const,
      label: 'Marcus Johnson',
      status: 'active' as const,
      decay: 0.95,
      lastMentioned: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      centrality: 0.85,
      team: 'Engineering',
      reasoning: 'Technical lead on Q1 features'
    },
    {
      id: 'n3',
      type: 'decision' as const,
      label: 'Pricing Strategy v3',
      status: 'conflicted' as const,
      decay: 0.9,
      lastMentioned: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      centrality: 0.95,
      reasoning: 'Active conflict between Marketing and Finance'
    },
    {
      id: 'n4',
      type: 'person' as const,
      label: 'Emily Rodriguez',
      status: 'aging' as const,
      decay: 0.6,
      lastMentioned: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      centrality: 0.7,
      team: 'Marketing',
      reasoning: 'Last communication 3 days ago - potential knowledge gap'
    },
    {
      id: 'n5',
      type: 'topic' as const,
      label: 'Q1 Product Launch',
      status: 'active' as const,
      decay: 1.0,
      lastMentioned: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
      centrality: 0.88,
      reasoning: 'High-priority initiative with multiple dependencies'
    },
    {
      id: 'n6',
      type: 'decision' as const,
      label: 'Feature Prioritization',
      status: 'stale' as const,
      decay: 0.3,
      lastMentioned: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      centrality: 0.5,
      reasoning: 'No recent discussion - may be outdated'
    },
    {
      id: 'n7',
      type: 'person' as const,
      label: 'David Kim',
      status: 'active' as const,
      decay: 0.85,
      lastMentioned: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      centrality: 0.75,
      team: 'Finance',
      reasoning: 'Involved in pricing and budget discussions'
    }
  ] as GraphNode[],
  
  edges: [
    {
      id: 'e1',
      source: 'n1',
      target: 'n3',
      type: 'influences' as const,
      strength: 0.9
    },
    {
      id: 'e2',
      source: 'n3',
      target: 'n5',
      type: 'depends_on' as const,
      strength: 0.85
    },
    {
      id: 'e3',
      source: 'n4',
      target: 'n3',
      type: 'conflicts_with' as const,
      strength: 0.7
    },
    {
      id: 'e4',
      source: 'n2',
      target: 'n5',
      type: 'influences' as const,
      strength: 0.8
    },
    {
      id: 'e5',
      source: 'n5',
      target: 'n6',
      type: 'depends_on' as const,
      strength: 0.4
    },
    {
      id: 'e6',
      source: 'n7',
      target: 'n3',
      type: 'conflicts_with' as const,
      strength: 0.6
    }
  ] as GraphEdge[]
};

export const syntheticConflicts: Conflict[] = [
  {
    id: 'c1',
    team1: 'Marketing',
    team2: 'Engineering',
    topic: 'Q1 Product Launch Timeline',
    severity: 'high',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    description: 'Marketing expects Feb 15 launch, Engineering targeting Mar 1'
  },
  {
    id: 'c2',
    team1: 'Sales',
    team2: 'Finance',
    topic: 'Pricing Strategy Approval',
    severity: 'medium',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    description: 'Disagreement on discount structure for enterprise clients'
  },
  {
    id: 'c3',
    team1: 'Product',
    team2: 'Engineering',
    topic: 'Feature Prioritization',
    severity: 'low',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    description: 'Minor conflict on Q2 roadmap priorities'
  }
];

export const syntheticDecisions: Decision[] = [
  {
    id: 'd1',
    version: 3,
    title: 'Pricing Strategy Revision',
    author: 'Sarah Chen',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    change: 'Updated from v2',
    reasoning: 'Incorporated Finance feedback on margin requirements',
    status: 'new'
  },
  {
    id: 'd2',
    version: 2,
    title: 'Q1 Launch Timeline',
    author: 'Marcus Johnson',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    change: 'Updated from v1',
    reasoning: 'Extended deadline due to infrastructure dependencies',
    status: 'updated'
  },
  {
    id: 'd3',
    version: 1,
    title: 'Team Structure Reorganization',
    author: 'Emily Rodriguez',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    change: 'Initial version',
    reasoning: 'Proposed new reporting structure for Marketing',
    status: 'updated'
  },
  {
    id: 'd4',
    version: 4,
    title: 'Budget Allocation Q1',
    author: 'David Kim',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    change: 'Updated from v3',
    reasoning: 'Reallocated funds to infrastructure spending',
    status: 'old'
  },
  {
    id: 'd5',
    version: 1,
    title: 'Customer Support SLA',
    author: 'Sarah Chen',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    change: 'Initial version',
    reasoning: 'Established baseline response time commitments',
    status: 'old'
  }
];

// Health score calculation
export const calculateHealthScore = (): number => {
  const totalConflicts = syntheticConflicts.length;
  const severityWeights = { low: 5, medium: 10, high: 20 };
  
  const totalSeverity = syntheticConflicts.reduce((sum, conflict) => {
    return sum + severityWeights[conflict.severity];
  }, 0);
  
  return Math.max(0, 100 - totalSeverity);
};

// Heartbeat data (simulates real-time health over last 30 minutes)
export const generateHeartbeatData = () => {
  const data = [];
  const now = Date.now();
  const healthScore = calculateHealthScore();
  
  for (let i = 30; i >= 0; i--) {
    data.push({
      time: new Date(now - i * 60 * 1000),
      health: healthScore + (Math.random() * 10 - 5), // Add some variance
      label: i === 0 ? 'Now' : `${i}m`
    });
  }
  
  return data;
};

