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
import type { GraphNode, GraphEdge } from "@/lib/api";

// Custom node component with decay effect
const CustomNode = ({ data }: { data: GraphNode }) => {
  const statusColors = {
    active: '#10b981',
    aging: '#f59e0b',
    conflicted: '#ef4444',
    stale: '#6b7280'
  };

  const nodeTypeIcons = {
    person: '👤',
    decision: '📋',
    topic: '💡'
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
        className="px-4 py-3 rounded-lg border-2 bg-[#0f0f0f] min-w-[120px] cursor-pointer hover:bg-[#121212] transition-all"
        style={{ 
          borderColor: statusColors[data.status],
          boxShadow: `0 0 ${10 + data.centrality * 20}px ${statusColors[data.status]}40`
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{nodeTypeIcons[data.type]}</span>
          <div>
            <div className="text-xs text-white font-medium">{data.label}</div>
            {data.team && (
              <div className="text-[10px] text-gray-500">{data.team}</div>
            )}
          </div>
        </div>
        
        {/* Status indicator */}
        <div 
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0f0f0f]"
          style={{ backgroundColor: statusColors[data.status] }}
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
        className="bg-[#0a0a0a]"
        minZoom={0.5}
        maxZoom={2}
      >
        <Background 
          color="#151515" 
          gap={50} 
          size={1}
          className="opacity-30"
        />
        <Controls 
          className="bg-[#0f0f0f] border border-[#2a2a2a]"
        />
        <MiniMap 
          className="bg-[#0f0f0f] border border-[#2a2a2a]"
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

