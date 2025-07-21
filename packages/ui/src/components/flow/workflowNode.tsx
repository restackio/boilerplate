import { memo } from "react";
import React from "react";
import { NodeProps } from "@xyflow/react";
import * as Icons from "lucide-react";

import { BaseNode } from "./baseNode";
import { DefaultNode, NodeData } from "./defaultNode";
import {
  NodeHeader,
  NodeHeaderTitle,
  NodeHeaderActions,
  NodeHeaderMenuAction,
  NodeHeaderIcon,
} from "./nodeHeader";
import { DropdownMenuItem } from "../ui/dropdown-menu";
import { StepForward } from "lucide-react";
import { BaseHandle } from "./baseHandle";
import { NodeStatusIndicator } from "./nodeStatusIndicator";

const WorkflowNode = memo(
  ({ id, selected, isConnectable, data }: NodeProps) => {
    const { label, description, icon, handles, openEditPanel, deleteNode } =
      data as NodeData & {
        openEditPanel: (data: NodeData) => void;
        deleteNode: (nodeId: string) => void;
      };

    const nodeIcon =
      typeof icon === "string" && Icons[icon] ? (
        React.createElement(Icons[icon], { className: "h-4 w-4" })
      ) : (
        <StepForward className="h-4 w-4" />
      );

    return (
      <div>
        {isConnectable &&
          handles &&
          handles.map((handle) => {
            return (
              <BaseHandle
                key={handle.id}
                id={handle.id}
                type={handle.type}
                position={handle.position}
              />
            );
          })}
        <NodeStatusIndicator
          status={
            data.status as
              | "loading"
              | "success"
              | "error"
              | "initial"
              | undefined
          }
        >
          <BaseNode selected={selected} className="space-y-2">
            <NodeHeader className="-mx-2 -mt-2 border-b">
              {nodeIcon && <NodeHeaderIcon>{nodeIcon}</NodeHeaderIcon>}
              <NodeHeaderTitle>{label}</NodeHeaderTitle>
              <NodeHeaderActions>
                <NodeHeaderMenuAction label="Edit">
                  <DropdownMenuItem
                    onClick={() => openEditPanel(data as NodeData)}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteNode(id)}>
                    Delete
                  </DropdownMenuItem>
                </NodeHeaderMenuAction>
              </NodeHeaderActions>
            </NodeHeader>
            <div className="text-xs text-muted-foreground">{description}</div>
          </BaseNode>
        </NodeStatusIndicator>
      </div>
    );
  }
);

export const nodeTypes = {
  default: DefaultNode,
  workflow: WorkflowNode,
};

export type { NodeData };

export { WorkflowNode };
