"use client"

import { memo } from "react"
import { BaseEdge, EdgeLabelRenderer, type EdgeProps, getSmoothStepPath } from "@xyflow/react"

const WorkflowEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd,
    sourceHandleId,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
    });

    const transform = `translate(${labelX}px,${labelY}px) translate(-50%, -50%)`;
 
    return (
      <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      {sourceHandleId && (
        <EdgeLabelRenderer>
          <div
            className="absolute rounded border bg-background px-1 text-foreground"
            style={{ transform }}
          >
            <pre className="text-xs">{sourceHandleId}</pre>
          </div>
        </EdgeLabelRenderer>
      )}
      </>
    )
  },
)
WorkflowEdge.displayName = "WorkflowEdge"

export const edgeTypes = {
  workflow: WorkflowEdge,
}

