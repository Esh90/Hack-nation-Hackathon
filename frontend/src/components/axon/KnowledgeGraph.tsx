import { useCallback, useMemo, useEffect } from "react";
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
} from "reactflow";
import "reactflow/dist/style.css";
import { useTheme } from "next-themes";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { GraphNode, GraphEdge } from "@/lib/api";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 56;
const GRID_H_GAP = 100;
const GRID_V_GAP = 70;

function getGridLayoutPositions(nodes: GraphNode[]): { x: number; y: number }[] {
  const cols = Math.max(2, Math.ceil(Math.sqrt(nodes.length * 1.8)));
  return nodes.map((_, i) => {
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      x: col * (NODE_WIDTH + GRID_H_GAP),
      y: row * (NODE_HEIGHT + GRID_V_GAP),
    };
  });
}

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
    if (e.type === "conflicts_with") {
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

function getNodeScale(nodeCount: number): number {
  if (nodeCount <= 4) return 1;
  if (nodeCount <= 8) return 0.95;
  if (nodeCount <= 16) return 0.85;
  if (nodeCount <= 24) return 0.75;
  return Math.max(0.5, 0.7 - (nodeCount - 24) * 0.015);
}

const edgeTypeLabels: Record<string, string> = {
  influences: "influences",
  depends_on: "depends on",
  conflicts_with: "conflicts with",
};

const statusColors: Record<string, string> = {
  active: "#10b981",
  aging: "#f59e0b",
  conflicted: "#ef4444",
  stale: "#6b7280",
};

function CustomNode({
  data,
}: {
  data: GraphNode & {
    _scale?: number;
    _connections?: { label: string; type: string }[];
    _hasConflict?: boolean;
    _highlighted?: boolean;
  };
}) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const scale = data._scale ?? 1;
  const highlighted = data._highlighted ?? false;
  const nodeStatus = data.status;
  const connections = data._connections ?? [];
  const minW = Math.round(120 * scale);
  const paddingX = Math.round(16 * scale);
  const paddingY = Math.round(12 * scale);
  const nodeTypeIcons: Record<string, string> = { person: "👤", decision: "📋", topic: "💡" };

  const bg = isDark ? "#0f0f0f" : "#d1fae5";
  const borderColor = highlighted ? "#3b82f6" : statusColors[nodeStatus];

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-full h-full">
            <Handle type="target" position={Position.Top} className="!w-2 !h-2 !border-0 !bg-gray-500" />
            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-0 !bg-gray-500" />
            <div
              className="rounded-lg border-2 cursor-pointer text-foreground"
              style={{
                backgroundColor: bg,
                borderColor,
                minWidth: minW,
                padding: `${paddingY}px ${paddingX}px`,
              }}
            >
              <div className="flex items-center gap-2">
                <span>{nodeTypeIcons[data.type] ?? "💡"}</span>
                <div className="min-w-0">
                  <div className="font-medium truncate text-sm">{data.label}</div>
                  {data.team && <div className="truncate text-xs text-muted-foreground">{data.team}</div>}
                </div>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[240px]">
          <div className="space-y-1.5">
            <div className="font-medium">{data.label}</div>
            <div className="text-[10px] text-muted-foreground">Type: {data.type} · Status: {data.status}</div>
            {connections.length > 0 && (
              <div className="text-[10px] pt-1 border-t">
                Connected to:
                <ul className="mt-0.5 list-disc list-inside">
                  {connections.map((c, i) => (
                    <li key={i}>{c.label} ({edgeTypeLabels[c.type] ?? c.type})</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

const nodeTypes: NodeTypes = { custom: CustomNode };

interface KnowledgeGraphProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount?: number;
  highlightedNodeIds?: string[];
  onPersonClick?: (personId: string) => void;
}

function KnowledgeGraphInner({
  nodes,
  edges,
  nodeCount: nodeCountProp,
  highlightedNodeIds = [],
  onPersonClick,
}: KnowledgeGraphProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const nodeCount = nodeCountProp ?? nodes.length;
  const scale = getNodeScale(nodeCount);
  const highlightSet = useMemo(() => new Set(highlightedNodeIds), [highlightedNodeIds]);
  const nodeMeta = useMemo(() => buildNodeMeta(nodes, edges), [nodes, edges]);
  const positions = useMemo(() => getGridLayoutPositions(nodes), [nodes]);
  const nodeIdSet = useMemo(() => new Set(nodes.map((n) => n.id)), [nodes]);

  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((node, index) => {
        const meta = nodeMeta.get(node.id);
        const pos = positions[index];
        return {
          id: node.id,
          type: "custom",
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

  const flowEdges: Edge[] = useMemo(() => {
    const edgeColors: Record<string, string> = {
      influences: "#3b82f6",
      depends_on: "#a78bfa",
      conflicts_with: "#f87171",
    };
    const labelBgFill = isDark ? "#0f0f0f" : "#ffffff";
    return edges
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "smoothstep" as const,
        label: edgeTypeLabels[edge.type] ?? edge.type,
        labelStyle: { fill: edgeColors[edge.type], fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: labelBgFill, fillOpacity: 0.95 },
        labelBgPadding: [4, 2] as [number, number],
        labelBgBorderRadius: 4,
        style: { stroke: edgeColors[edge.type], strokeWidth: 3, opacity: 1 },
        zIndex: 10,
        markerEnd: { type: MarkerType.ArrowClosed, color: edgeColors[edge.type] },
      }));
  }, [edges, nodeIdSet, isDark]);

  const [flowNodesState, setFlowNodes, onNodesChange] = useNodesState(flowNodes);
  const [flowEdgesState, setFlowEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    setFlowNodes(flowNodes);
    setFlowEdges(flowEdges);
  }, [flowNodes, flowEdges, setFlowNodes, setFlowEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const d = node.data as { type?: string };
      if (d?.type === "person" && onPersonClick) onPersonClick(node.id);
    },
    [onPersonClick]
  );

  const defaultEdgeOptions = useMemo(() => ({ type: "smoothstep" as const, style: { strokeWidth: 3, opacity: 1 }, zIndex: 10 }), []);

  return (
    <div className="w-full h-full absolute inset-0">
      <ReactFlow
        key={`graph-${nodes.length}-${edges.length}`}
        nodes={flowNodesState}
        edges={flowEdgesState}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1.2 }}
        className={isDark ? "bg-[#0a0a0a]" : "bg-[#f5f5f5]"}
        minZoom={0.2}
        maxZoom={2}
      >
        <FitViewOnChange />
        <Background color={isDark ? "#151515" : "#e5e5e5"} gap={50} size={1} className="opacity-30" />
        <Controls className={isDark ? "bg-[#0f0f0f] border border-[#2a2a2a]" : "bg-white border border-[#e5e5e5]"} position="bottom-left" />
        <MiniMap
          position="bottom-right"
          className={isDark ? "!bg-[#0f0f0f] !border-[#1a1a1a]" : "!bg-white !border-[#e5e5e5]"}
          nodeColor={(node) => statusColors[node.data.status as string] ?? "#6b7280"}
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
