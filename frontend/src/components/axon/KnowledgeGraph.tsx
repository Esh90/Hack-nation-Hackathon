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
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import dagre from 'dagre';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useCrisisMode } from '@/hooks/useCrisisMode';
import type { GraphNode, GraphEdge } from "@/lib/api";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;

// Dagre layout: returns nodes with positions from graph structure
function getLayoutedNodes(nodes: GraphNode[], edges: GraphEdge[]): { x: number; y: number }[] {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80 });
  g.setDefaultEdgeLabel(() => ({}));
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return nodes.map((n) => {
    const node = g.node(n.id);
    return {
      x: node.x - NODE_WIDTH / 2,
      y: node.y - NODE_HEIGHT / 2,
    };
  });
}

// Build per-node connection list and conflict flag for tooltips
function buildNodeMeta(
  nodes: GraphNode[],
  edges: GraphEdge[]
): Map<string, { connections: { label: string; type: string }[]; hasConflict: boolean }> {
  const idToLabel = new Map(nodes.map((n) => [n.id, n.label]));
  const outEdges = new Map<string, { label: string; type: string }[]>();
  const conflictNodes = new Set<string>();
  edges.forEach((e) => {
    const label = idToLabel.get(e.target) ?? e.target;
    if (!outEdges.has(e.source)) outEdges.set(e.source, []);
    outEdges.get(e.source)!.push({ label, type: e.type });
    if (e.type === 'conflicts_with') {
      conflictNodes.add(e.source);
      conflictNodes.add(e.target);
    }
  });
  const result = new Map<string, { connections: { label: string; type: string }[]; hasConflict: boolean }>();
  nodes.forEach((n) => {
    result.set(n.id, {
      connections: outEdges.get(n.id) ?? [],
      hasConflict: conflictNodes.has(n.id),
    });
  });
  return result;
}

// Compute scale factor so many nodes stay visible (smaller nodes when more nodes)
function getNodeScale(nodeCount: number): number {
  if (nodeCount <= 4) return 1;
  if (nodeCount <= 8) return 0.95;
  if (nodeCount <= 16) return 0.85;
  if (nodeCount <= 24) return 0.75;
  return Math.max(0.5, 0.7 - (nodeCount - 24) * 0.015);
}

const edgeTypeLabels: Record<string, string> = {
  influences: 'influences',
  depends_on: 'depends on',
  conflicts_with: 'conflicts with',
};

// Custom node component with decay, tooltip, conflict pulse, centrality
const CustomNode = ({
  data,
}: {
  data: GraphNode & {
    _scale?: number;
    _connections?: { label: string; type: string }[];
    _hasConflict?: boolean;
    _highlighted?: boolean;
  };
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { isCrisisActive } = useCrisisMode();
  const nodeStatus = isCrisisActive ? 'conflicted' : data.status;
  const scale = data._scale ?? 1;
  const highlighted = data._highlighted ?? false;
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

  const minW = Math.round(120 * scale);
  const paddingX = Math.round(16 * scale);
  const paddingY = Math.round(12 * scale);
  const fontSize = scale < 0.8 ? '10px' : '12px';
  const iconSize = scale < 0.8 ? 'text-base' : 'text-lg';
  const connections = data._connections ?? [];

  const getBackgroundColor = () => {
    if (isDark) return '#0f0f0f';
    return lightStatusBgColors[nodeStatus];
  };
  const getHoverBackgroundColor = () => {
    if (isDark) return '#121212';
    const hoverColors = { active: '#bae6d1', aging: '#fde68a', conflicted: '#fecaca', stale: '#e5e7eb' };
    return hoverColors[nodeStatus];
  };
  const getTextColor = () => (isDark ? '#ffffff' : '#25343F');
  const getTeamColor = () => '#6b7280';

  const content = (
    <motion.div
      initial={{ scale: 0 }}
      animate={{
        scale: isCrisisActive
          ? 1.1 * (0.5 + (data.centrality ?? 0) * 0.5) * scale
          : (0.5 + (data.centrality ?? 0) * 0.5) * scale,
        opacity: data.decay ?? 1,
      }}
      transition={{ duration: 0.3 }}
      className="relative"
    >
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-0 !bg-gray-500" />
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !border-0 !bg-gray-500" />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-0 !bg-gray-500" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-0 !bg-gray-500" />
      <div
        className={`rounded-lg border-2 cursor-pointer transition-all ${iconSize} ${highlighted ? "ring-2 ring-info ring-offset-2 ring-offset-[#0a0a0a]" : ""} ${isCrisisActive ? 'animate-pulse' : ''}`}
        style={{
          backgroundColor: getBackgroundColor(),
          borderColor: highlighted ? '#3b82f6' : statusColors[nodeStatus],
          boxShadow: highlighted
            ? `0 0 20px rgba(59, 130, 246, 0.6), 0 0 ${10 + (data.centrality ?? 0) * 20}px ${statusColors[nodeStatus]}40`
            : `0 0 ${10 + (data.centrality ?? 0) * 20}px ${statusColors[nodeStatus]}40`,
          minWidth: minW,
          padding: `${paddingY}px ${paddingX}px`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = getHoverBackgroundColor(); }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = getBackgroundColor(); }}
      >
        <div className="flex items-center gap-2">
          <span>{nodeTypeIcons[data.type]}</span>
          <div className="min-w-0">
            <div 
              className="font-medium truncate"
              style={{ 
                fontSize,
                color: getTextColor()
              }}
            >
              {data.label}
            </div>
            {data.team && (
              <div 
                className="truncate"
                style={{ 
                  fontSize: Math.max(9, 10 * scale),
                  color: getTeamColor()
                }}
              >
                {data.team}
              </div>
            )}
          </div>
        </div>
        <div
          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${isCrisisActive ? 'animate-pulse' : ''}`}
          style={{ backgroundColor: statusColors[nodeStatus], borderColor: getBackgroundColor() }}
        />
      </div>
    </motion.div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-full">{content}</div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[240px] bg-[#0f0f0f] border-[#1a1a1a] text-left"
        >
          <div className="space-y-1.5">
            <div className="font-medium text-white">{data.label}</div>
            <div className="text-[10px] text-gray-400">
              Type: {data.type} · Status: {data.status}
            </div>
            {connections.length > 0 && (
              <div className="text-[10px] text-gray-300 pt-1 border-t border-[#1a1a1a]">
                Connected to:
                <ul className="mt-0.5 list-disc list-inside">
                  {connections.map((c, i) => (
                    <li key={i}>
                      {c.label} <span className="text-gray-500">({edgeTypeLabels[c.type] ?? c.type})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount?: number;
  highlightedNodeIds?: string[];
  onPersonClick?: (personId: string) => void;
}

function KnowledgeGraphInner({ nodes, edges, nodeCount: nodeCountProp, highlightedNodeIds = [], onPersonClick }: KnowledgeGraphProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const nodeCount = nodeCountProp ?? nodes.length;
  const scale = getNodeScale(nodeCount);
  const highlightSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);

  const nodeMeta = useMemo(() => buildNodeMeta(nodes, edges), [nodes, edges]);
  const positions = useMemo(() => getLayoutedNodes(nodes, edges), [nodes, edges]);

  const flowNodes: Node[] = useMemo(() =>
    nodes.map((node, index) => {
      const meta = nodeMeta.get(node.id);
      const pos = positions[index];
      return {
        id: node.id,
        type: 'custom',
        position: pos ? { x: pos.x, y: pos.y } : { x: 0, y: 0 },
        data: {
          ...node,
          _scale: scale,
          _connections: meta?.connections ?? [],
          _hasConflict: meta?.hasConflict ?? false,
          _highlighted: highlightSet.has(node.id),
        },
      };
    }),
    [nodes, nodeMeta, positions, scale, highlightSet]
  );

  const flowSourceForAnimation = highlightedNodeIds.length > 0 ? highlightedNodeIds[0] : null;

  const flowEdges: Edge[] = useMemo(() => {
    const edgeColors: Record<string, string> = {
      influences: '#3b82f6',
      depends_on: '#a78bfa',
      conflicts_with: '#f87171',
    };
    return edges.map((edge) => {
      const isFlowEdge = flowSourceForAnimation && (edge.source === flowSourceForAnimation || edge.target === flowSourceForAnimation);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        label: edgeTypeLabels[edge.type] ?? edge.type,
        labelStyle: { fill: edgeColors[edge.type], fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: '#0f0f0f', fillOpacity: 0.95 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        animated: edge.type === 'conflicts_with' || isFlowEdge,
        className: isFlowEdge ? 'flow-edge' : undefined,
        style: {
          stroke: edgeColors[edge.type],
          strokeWidth: 3,
          opacity: 1,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColors[edge.type],
        },
      };
    });
  }, [edges, flowSourceForAnimation]);

  const [flowNodesState, , onNodesChange] = useNodesState(flowNodes);
  const [flowEdgesState, , onEdgesChange] = useEdgesState(flowEdges);

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      const data = node.data as { type?: string };
      if (data?.type === "person" && onPersonClick) {
        onPersonClick(node.id);
      }
    },
    [onPersonClick]
  );

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
        className={isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"}
        minZoom={0.2}
        maxZoom={2}
      >
        <FitViewOnChange key={layoutKey} />
        <Background 
          color={isDark ? "#151515" : "#e5e5e5"} 
          gap={50} 
          size={1}
          className="opacity-30"
        />
        <Controls
          className={isDark ? "bg-[#0f0f0f] border border-[#2a2a2a]" : "bg-white border border-[#e5e5e5]"}
          position="bottom-left"
        />
        <MiniMap
          position="bottom-right"
          className={isDark ? "minimap-small !bg-[#0f0f0f] !border-[#1a1a1a] [&_svg]:!outline-none" : "minimap-small !bg-white !border-[#e5e5e5] [&_svg]:!outline-none"}
          style={{
            backgroundColor: isDark ? '#0f0f0f' : '#ffffff',
            borderColor: isDark ? '#1a1a1a' : '#e5e5e5',
          }}
          maskColor={isDark ? "rgba(15, 15, 15, 0.85)" : "rgba(255,255,255,0.85)"}
          maskStrokeColor={isDark ? "#2a2a2a" : "#e5e5e5"}
          maskStrokeWidth={1}
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
