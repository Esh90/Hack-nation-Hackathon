import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import type { GraphNode, GraphEdge } from "@/lib/api";

// Custom node component with decay effect
const CustomNode = ({ data }: { data: GraphNode }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const statusColors = {
    active: '#10b981',
    aging: '#f59e0b',
    conflicted: '#ef4444',
    stale: '#6b7280'
  };

  // Light theme card backgrounds based on status
  const lightStatusBgColors = {
    active: '#d1fae5', // Light green
    aging: '#fef3c7', // Light yellow/amber
    conflicted: '#fee2e2', // Light red
    stale: '#f3f4f6' // Light gray
  };

  const nodeTypeIcons = {
    person: '👤',
    decision: '📋',
    topic: '💡'
  };

  const isPerson = data.type === 'person';

  // Determine background color based on theme and status
  const getBackgroundColor = () => {
    if (isDark) {
      return '#0f0f0f'; // Dark theme - keep as is
    } else {
      // Light theme - use status-based colors
      return lightStatusBgColors[data.status];
    }
  };

  const getHoverBackgroundColor = () => {
    if (isDark) {
      return '#121212';
    } else {
      // Light theme - slightly darker version of status color
      const hoverColors = {
        active: '#bae6d1',
        aging: '#fde68a',
        conflicted: '#fecaca',
        stale: '#e5e7eb'
      };
      return hoverColors[data.status];
    }
  };

  const getTextColor = () => {
    if (isDark) {
      return '#ffffff';
    } else {
      // Light theme - dark text for contrast
      return '#25343F';
    }
  };

  const getTeamColor = () => {
    if (isDark) {
      return '#6b7280';
    } else {
      return '#6b7280'; // Medium gray for team text in light mode
    }
  };

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ 
        scale: 0.5 + (data.centrality * 0.5),
        opacity: data.decay 
      }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div 
        className="px-4 py-3 rounded-lg border-2 min-w-[120px] cursor-pointer transition-all"
        style={{ 
          backgroundColor: getBackgroundColor(),
          borderColor: statusColors[data.status],
          boxShadow: `0 0 ${10 + data.centrality * 20}px ${statusColors[data.status]}40`
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = getHoverBackgroundColor();
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = getBackgroundColor();
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{nodeTypeIcons[data.type]}</span>
          <div>
            <div 
              className="text-xs font-medium"
              style={{ color: getTextColor() }}
            >
              {data.label}
            </div>
            {data.team && (
              <div 
                className="text-[10px]"
                style={{ color: getTeamColor() }}
              >
                {data.team}
              </div>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2"
          style={{ 
            backgroundColor: statusColors[data.status],
            borderColor: isDark ? '#0f0f0f' : getBackgroundColor()
          }}
        />
      </div>
    </motion.div>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export default function KnowledgeGraph({ nodes, edges }: KnowledgeGraphProps) {
  // Transform data to ReactFlow format
  const flowNodes: Node[] = useMemo(() => 
    nodes.map((node, index) => ({
      id: node.id,
      type: 'custom',
      position: { 
        x: (index % 4) * 180 + 60, 
        y: Math.floor(index / 4) * 120 + 30 
      },
      data: node,
    })),
    [nodes]
  );

  const flowEdges: Edge[] = useMemo(() =>
    edges.map(edge => {
      const edgeColors = {
        influences: '#3b82f6',
        depends_on: '#8b5cf6',
        conflicts_with: '#ef4444'
      };

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        animated: edge.type === 'conflicts_with',
        style: { 
          stroke: edgeColors[edge.type],
          strokeWidth: 1 + edge.strength,
          opacity: 0.6
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColors[edge.type],
        },
      };
    }),
    [edges]
  );

  const [flowNodesState, , onNodesChange] = useNodesState(flowNodes);
  const [flowEdgesState, , onEdgesChange] = useEdgesState(flowEdges);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    console.log('Node clicked:', node.data);
    // TODO: Show node details panel
  }, []);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="w-full h-full absolute inset-0">
      <ReactFlow
        nodes={flowNodesState}
        edges={flowEdgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className={isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"}
        minZoom={0.5}
        maxZoom={2}
      >
        <Background 
          color={isDark ? "#151515" : "#e5e5e5"} 
          gap={50} 
          size={1}
          className="opacity-30"
        />
        <Controls 
          className={isDark ? "bg-[#0f0f0f] border border-[#2a2a2a]" : "bg-white border border-[#e5e5e5]"}
        />
        <MiniMap 
          className={isDark ? "bg-[#0f0f0f] border border-[#2a2a2a]" : "bg-white border border-[#e5e5e5]"}
          nodeColor={(node) => {
            const statusColors = {
              active: '#10b981',
              aging: '#f59e0b',
              conflicted: '#ef4444',
              stale: '#6b7280'
            };
            return statusColors[node.data.status as keyof typeof statusColors];
          }}
        />
      </ReactFlow>
    </div>
  );
}

