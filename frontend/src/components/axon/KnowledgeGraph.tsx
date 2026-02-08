import { useCallback, useMemo, useEffect } from 'react';
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
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import type { GraphNode, GraphEdge } from "@/lib/api";

// Compute scale factor so many nodes stay visible (smaller nodes when more nodes)
function getNodeScale(nodeCount: number): number {
  if (nodeCount <= 4) return 1;
  if (nodeCount <= 8) return 0.95;
  if (nodeCount <= 16) return 0.85;
  if (nodeCount <= 24) return 0.75;
  return Math.max(0.5, 0.7 - (nodeCount - 24) * 0.015);
}

// Custom node component with decay effect; size scales with total node count
const CustomNode = ({ data }: { data: GraphNode & { _scale?: number } }) => {
  const scale = data._scale ?? 1;
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

  const minW = Math.round(120 * scale);
  const paddingX = Math.round(16 * scale);
  const paddingY = Math.round(12 * scale);
  const fontSize = scale < 0.8 ? '10px' : '12px';
  const iconSize = scale < 0.8 ? 'text-base' : 'text-lg';

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ 
        scale: (0.5 + (data.centrality * 0.5)) * scale,
        opacity: data.decay 
      }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <div 
        className={`rounded-lg border-2 bg-[#0f0f0f] cursor-pointer hover:bg-[#121212] transition-all ${iconSize}`}
        style={{ 
          borderColor: statusColors[data.status],
          boxShadow: `0 0 ${10 + data.centrality * 20}px ${statusColors[data.status]}40`,
          minWidth: minW,
          padding: `${paddingY}px ${paddingX}px`,
        }}
      >
        <div className="flex items-center gap-2">
          <span>{nodeTypeIcons[data.type]}</span>
          <div className="min-w-0">
            <div className="text-white font-medium truncate" style={{ fontSize }}>{data.label}</div>
            {data.team && (
              <div className="text-gray-500 truncate" style={{ fontSize: Math.max(9, 10 * scale) }}>{data.team}</div>
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
  nodeCount?: number;
}

function KnowledgeGraphInner({ nodes, edges, nodeCount: nodeCountProp }: KnowledgeGraphProps) {
  const nodeCount = nodeCountProp ?? nodes.length;
  const scale = getNodeScale(nodeCount);
  const cols = Math.max(2, Math.min(5, Math.ceil(Math.sqrt(nodeCount))));
  const spacingX = Math.max(100, 200 - nodeCount * 2);
  const spacingY = Math.max(80, 120 - nodeCount);

  // Transform data to ReactFlow format; layout by count so they spread nicely
  const flowNodes: Node[] = useMemo(() => 
    nodes.map((node, index) => ({
      id: node.id,
      type: 'custom',
      position: { 
        x: (index % cols) * spacingX + 40, 
        y: Math.floor(index / cols) * spacingY + 20 
      },
      data: { ...node, _scale: scale },
    })),
    [nodes, cols, spacingX, spacingY, scale]
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
  }, []);

  const layoutKey = `${nodes.length}-${edges.length}`;

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
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        className="bg-[#0a0a0a]"
        minZoom={0.2}
        maxZoom={2}
      >
        <FitViewOnChange key={layoutKey} />
        <Background 
          color="#151515" 
          gap={50} 
          size={1}
          className="opacity-30"
        />
        <Controls 
          className="react-flow-controls-dark"
        />
        <MiniMap 
          position="bottom-right"
          className="minimap-small !bg-[#0f0f0f] !border-[#1a1a1a] [&_svg]:!outline-none"
          style={{ backgroundColor: '#0f0f0f', borderColor: '#1a1a1a' }}
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

function FitViewOnChange() {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 80);
    return () => clearTimeout(t);
  }, [fitView]);
  return null;
}

export default function KnowledgeGraph(props: KnowledgeGraphProps) {
  return (
    <ReactFlowProvider>
      <KnowledgeGraphInner {...props} />
    </ReactFlowProvider>
  );
}

