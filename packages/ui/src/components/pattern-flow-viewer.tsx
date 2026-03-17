"use client";

import { useMemo, useEffect, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { memo } from "react";
import * as Icons from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

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

const PatternNode = memo(({ data }: NodeProps) => {
  const label = (data?.label as string) ?? "Node";
  const description = data?.description as string | undefined;
  const iconName = data?.icon as string | undefined;
  const entityType = data?.entityType as string | undefined;
  const variant = getNodeVariant(entityType);
  const Icon =
    typeof iconName === "string" && iconName in Icons
      ? (Icons[iconName as keyof typeof Icons] as React.ComponentType<{ className?: string }>)
      : null;
  return (
    <div
      className={cn(
        "min-w-[120px] max-w-[180px] rounded-md border p-2 shadow-sm",
        variant
      )}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 shrink-0 opacity-90" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          {description && (
            <p className="truncate text-xs text-muted">{description}</p>
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
              className="absolute rounded-md border border-border bg-muted/95 px-1.5 py-0.5 text-xs text-foreground shadow-sm"
              style={{ transform }}
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }
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

function toReactFlowEdges(specEdges: PatternFlowSpec["edges"]): Edge[] {
  if (!specEdges?.length) return [];
  return specEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "patternEdge",
    sourceHandle: e.sourceHandle,
    targetHandle: e.targetHandle,
    data: { label: e.label },
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
    [patternSpecs?.nodes]
  );
  const specEdges = useMemo(
    () => patternSpecs?.edges ?? [],
    [patternSpecs?.edges]
  );
  const initialNodes = useMemo(
    () => toReactFlowNodes(specNodes),
    [specNodes]
  );
  const initialEdges = useMemo(
    () => toReactFlowEdges(specEdges),
    [specEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(toReactFlowNodes(specNodes));
    setEdges(toReactFlowEdges(specEdges));
  }, [specNodes, specEdges, setNodes, setEdges]);

  const onInit = useCallback(() => {}, []);

  if (initialNodes.length === 0) return null;

  return (
    <div className={className} style={{ height: `${height}px` }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
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
