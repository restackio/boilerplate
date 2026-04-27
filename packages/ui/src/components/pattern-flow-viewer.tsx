"use client";

import {
  useMemo,
  useEffect,
  useLayoutEffect,
  useCallback,
  useRef,
} from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  useNodesState,
  useEdgesState,
  useStore,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { memo } from "react";
import * as Icons from "lucide-react";
import {
  Database,
  Layers,
  LayoutGrid,
  MessageSquare,
  Plug,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { getLayoutedElementsHorizontal } from "./flow/auto-layout";

/** Minimal pattern spec shape for the viewer (avoids coupling to frontend types). */
export interface PatternFlowSpec {
  title?: string;
  nodes?: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data?: {
      label?: string;
      description?: string;
      icon?: string;
      entityType?: string;
      agentType?: string;
      entityId?: string;
      href?: string;
    };
  }>;
  edges?: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    sourceHandle?: string;
    targetHandle?: string;
    label?: string;
  }>;
}

/** Node style by entity type: agent=blue, dataset=black, tools/integration=white */
function getNodeVariant(entityType: string | undefined) {
  switch (entityType) {
    case "agent":
      return "bg-blue-600 text-white border-blue-600 [&_.text-muted]:text-blue-200";
    case "dataset":
      return "bg-black text-white border-black [&_.text-muted]:text-neutral-300";
    case "integration":
    default:
      return "bg-white text-black border-border [&_.text-muted]:text-muted-foreground";
  }
}

/** Default role title and icon for pattern nodes (shown above the node label). */
function getRoleTitleAndIcon(
  entityType: string | undefined,
  agentType: string | undefined,
): { title: string; Icon: LucideIcon } {
  if (entityType === "agent") {
    const normalized =
      typeof agentType === "string" ? agentType.toLowerCase() : "";
    if (normalized === "pipeline" || normalized.includes("pipeline")) {
      return { title: "Pipeline agent", Icon: Workflow };
    }
    if (normalized === "batch" || normalized.includes("batch")) {
      return { title: "Batch agent", Icon: Layers };
    }
    return { title: "Interactive agent", Icon: MessageSquare };
  }
  switch (entityType) {
    case "dataset":
      return { title: "Context store", Icon: Database };
    case "view":
      return { title: "View", Icon: LayoutGrid };
    case "integration":
      return { title: "Integration", Icon: Plug };
    default:
      return { title: "Node", Icon: MessageSquare };
  }
}

const PatternNode = memo(({ id, data }: NodeProps) => {
  const label = (data?.label as string) ?? "Node";
  const description = data?.description as string | undefined;
  const iconName = data?.icon as string | undefined;
  const entityType = data?.entityType as string | undefined;
  const agentType = data?.agentType as string | undefined;
  const variant = getNodeVariant(entityType);
  const { title: roleTitle, Icon: RoleIcon } = getRoleTitleAndIcon(
    entityType,
    agentType,
  );
  const Icon =
    typeof iconName === "string" && iconName in Icons
      ? (Icons[iconName as keyof typeof Icons] as React.ComponentType<{
          className?: string;
        }>)
      : null;

  const edges = useStore((state) => state.edges);
  const hasTargetEdge = edges.some(
    (e: Edge) =>
      e.target === id &&
      (e.targetHandle === "target" || e.targetHandle == null),
  );
  const hasSourceEdge = edges.some(
    (e: Edge) =>
      e.source === id &&
      (e.sourceHandle === "source" || e.sourceHandle == null),
  );

  return (
    <div
      className={cn(
        "relative min-w-[140px] border !border-foreground shadow-sm",
        variant,
      )}
    >
      {hasTargetEdge && (
        <Handle
          type="target"
          position={Position.Left}
          id="target"
          className="!border-2 !border-white !bg-slate-400 !w-2.5 !h-2.5"
        />
      )}
      {hasSourceEdge && (
        <Handle
          type="source"
          position={Position.Right}
          id="source"
          className="!border-2 !border-white !bg-slate-400 !w-2.5 !h-2.5"
        />
      )}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 border-b text-xs font-medium opacity-90",
          entityType === "agent" || entityType === "dataset"
            ? "border-white/20"
            : "border-border",
        )}
      >
        <RoleIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
        <span className="truncate font-semibold">{roleTitle}</span>
      </div>
      <div className="flex items-start gap-2 p-3">
        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90 mt-0.5" />}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words leading-snug">
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted break-words leading-snug mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
});
PatternNode.displayName = "PatternNode";

/** Edge with optional label (e.g. "pulls from" / "pushes to") */
const PatternEdge = memo(
  ({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 6,
    });
    const label = data?.label as string | undefined;
    const transform = `translate(${labelX}px,${labelY}px) translate(-50%, -50%)`;
    return (
      <>
        <BaseEdge path={edgePath} markerEnd={markerEnd} />
        {label && (
          <EdgeLabelRenderer>
            <div
              className="absolute border border-border bg-muted/95 px-1.5 py-0.5 text-xs text-foreground shadow-sm"
              style={{ transform }}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);
PatternEdge.displayName = "PatternEdge";

const nodeTypes = { patternNode: PatternNode };
const edgeTypes = { patternEdge: PatternEdge };

/** Filter out view nodes (view is implied in dataset). */
function toReactFlowNodes(specNodes: PatternFlowSpec["nodes"]): Node[] {
  if (!specNodes?.length) return [];
  return specNodes
    .filter((n) => n.data?.entityType !== "view")
    .map((n) => ({
      id: n.id,
      type: "patternNode",
      position: n.position ?? { x: 0, y: 0 },
      data: {
        label: n.data?.label ?? n.id,
        description: n.data?.description,
        icon: n.data?.icon,
        entityType: n.data?.entityType,
        agentType: n.data?.agentType,
      },
    }));
}

function toReactFlowEdges(
  specEdges: PatternFlowSpec["edges"],
  validNodeIds: Set<string>,
): Edge[] {
  if (!specEdges?.length) return [];
  return specEdges
    .filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
    .map((e) => {
      // Use explicit handle ids matching PatternNode (source/target); omit if invalid.
      const sourceHandle =
        e.sourceHandle != null && String(e.sourceHandle) !== "null"
          ? e.sourceHandle
          : "source";
      const targetHandle =
        e.targetHandle != null && String(e.targetHandle) !== "null"
          ? e.targetHandle
          : "target";
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: "patternEdge",
        sourceHandle,
        targetHandle,
        data: { label: e.label },
      };
    });
}

/** Default node size used by ELK for pattern nodes (for bbox). */
const PATTERN_NODE_WIDTH = 180;
const PATTERN_NODE_HEIGHT = 70;

const FIT_VIEW_OPTIONS = { padding: 0.2, maxZoom: 1 } as const;

/** Defer fitView until after React Flow and the container have laid out (avoids empty bbox). */
function scheduleFitView(instance: ReactFlowInstance | null) {
  if (!instance) return;
  const run = () => {
    try {
      instance.fitView(FIT_VIEW_OPTIONS);
    } catch {
      /* ignore */
    }
  };
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      run();
      setTimeout(run, 0);
    });
  });
}

/** Translate node positions so the graph's bounding box is centered at the origin. */
function centerLayoutedNodes(nodes: Node[]): Node[] {
  if (!nodes.length) return nodes;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const w = (node.width as number) ?? PATTERN_NODE_WIDTH;
    const h = (node.height as number) ?? PATTERN_NODE_HEIGHT;
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + w);
    maxY = Math.max(maxY, node.position.y + h);
  }
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - centerX,
      y: node.position.y - centerY,
    },
  }));
}

function PatternFlowViewerInner({
  patternSpecs,
  className,
  height = 280,
}: {
  patternSpecs: PatternFlowSpec;
  className?: string;
  height?: number;
}) {
  const specNodes = useMemo(
    () => patternSpecs?.nodes ?? [],
    [patternSpecs?.nodes],
  );
  const specEdges = useMemo(
    () => patternSpecs?.edges ?? [],
    [patternSpecs?.edges],
  );
  const initialNodes = useMemo(() => toReactFlowNodes(specNodes), [specNodes]);
  /** Stable key so identical specs don't re-run ELK when parent passes a new object reference each sync. */
  const specLayoutKey = useMemo(
    () =>
      JSON.stringify({
        nodes: specNodes,
        edges: specEdges,
      }),
    [specNodes, specEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const flowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const fitViewAfterLayoutRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resizeFitRafRef = useRef<number | null>(null);

  useEffect(() => {
    const nextNodes = toReactFlowNodes(specNodes);
    const nextValidIds = new Set(nextNodes.map((n) => n.id));
    const nextEdges = toReactFlowEdges(specEdges, nextValidIds);
    if (!nextNodes.length) {
      setNodes([]);
      setEdges([]);
      return;
    }
    let cancelled = false;
    getLayoutedElementsHorizontal(nextNodes, nextEdges).then(
      ({ nodes: layoutedNodes, edges: layoutedEdges }) => {
        if (cancelled) return;
        const centered = centerLayoutedNodes(layoutedNodes);
        fitViewAfterLayoutRef.current = true;
        setNodes(centered);
        setEdges(layoutedEdges);
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- specLayoutKey encodes specNodes + specEdges (stable graph content)
  }, [specLayoutKey, setNodes, setEdges]);

  useLayoutEffect(() => {
    if (!fitViewAfterLayoutRef.current || nodes.length === 0) return;
    const inst = flowInstanceRef.current;
    if (inst) {
      fitViewAfterLayoutRef.current = false;
      scheduleFitView(inst);
    }
    /* If inst is null, onInit runs after mount — leave flag set so onInit can clear + fit. */
  }, [nodes]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr || cr.width < 8 || cr.height < 8) return;
      if (nodes.length === 0) return;
      if (resizeFitRafRef.current != null) {
        cancelAnimationFrame(resizeFitRafRef.current);
      }
      resizeFitRafRef.current = requestAnimationFrame(() => {
        resizeFitRafRef.current = null;
        scheduleFitView(flowInstanceRef.current);
      });
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (resizeFitRafRef.current != null) {
        cancelAnimationFrame(resizeFitRafRef.current);
      }
    };
  }, [nodes.length]);

  const onInit = useCallback((instance: ReactFlowInstance) => {
    flowInstanceRef.current = instance;
    scheduleFitView(instance);
    if (fitViewAfterLayoutRef.current) {
      fitViewAfterLayoutRef.current = false;
    }
  }, []);

  if (initialNodes.length === 0) return null;

  const layoutPending = nodes.length === 0;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: `${height}px` }}
    >
      {layoutPending ? (
        <div
          className="h-full w-full rounded-md bg-muted/40 animate-pulse"
          aria-hidden
        />
      ) : (
        <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitViewOptions={FIT_VIEW_OPTIONS}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        zoomOnPinch={true}
        defaultEdgeOptions={{ type: "patternEdge" }}
      >
        <Background gap={12} size={0} className="bg-transparent" />
        <Controls
          showInteractive={false}
          className="!bottom-2 !left-2 !right-auto !top-auto"
        />
      </ReactFlow>
      )}
    </div>
  );
}

export function PatternFlowViewer({
  patternSpecs,
  className,
  height = 280,
}: {
  patternSpecs: PatternFlowSpec | null | undefined;
  className?: string;
  height?: number;
}) {
  if (!patternSpecs?.nodes?.length) return null;

  return (
    <ReactFlowProvider>
      <PatternFlowViewerInner
        patternSpecs={patternSpecs}
        className={className}
        height={height}
      />
    </ReactFlowProvider>
  );
}
