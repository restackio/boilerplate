"use client"

import React from "react";

import { JSX, memo } from "react"
import { Handle, type NodeProps } from "@xyflow/react"
import { StepForward } from "lucide-react"
import { BaseHandle } from "./baseHandle"
import { BaseNode } from "./baseNode"
import { NodeHeader, NodeHeaderIcon, NodeHeaderTitle } from "./nodeHeader"
import * as Icons from "lucide-react";
import { NodeStatusIndicator } from "./nodeStatusIndicator";
 
export type NodeData = {
  id: string;
  label: string;
  description: string;
  icon: JSX.Element;
  handles: Handle[];
}

const DefaultNode = memo(({ data, isConnectable, selected }: NodeProps) => {
  const { label, icon } = data as NodeData;

  // Use the provided icon or a default icon
  const nodeIcon = typeof icon === 'string' && Icons[icon] ? React.createElement(Icons[icon], { className: "h-4 w-4" }) : <StepForward className="h-4 w-4" />;


  const handles = data.handles as Handle[];

  return (
    <div>
      {isConnectable && handles.map((handle) => {
          return <BaseHandle key={handle.id} id={handle.id} type={handle.type} position={handle.position}/>
      })}
      <NodeStatusIndicator status={data.status as 'loading' | 'success' | 'error' | 'initial' | undefined}>
        <BaseNode selected={selected} className="space-y-2">
          <NodeHeader>
            {nodeIcon && <NodeHeaderIcon>{nodeIcon}</NodeHeaderIcon>}
            <NodeHeaderTitle>{label}</NodeHeaderTitle>
          </NodeHeader>
        </BaseNode>
      </NodeStatusIndicator>
    </div>
  );
});
DefaultNode.displayName = "DefaultNode"

export { DefaultNode }

