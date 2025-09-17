"use client";

import type React from "react";
import { useState, useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  NodeTypes,
  Controls,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "./ui/button";
import {
  Plus,
  Download,
  RotateCcw,
} from "lucide-react";
import { nodeTypes, NodeData } from "./flow/workflow-node";
import { edgeTypes } from "./flow/base-edge";
import { createNode, getLayoutedElements } from "./flow/auto-layout";

// Initial nodes for the agent flow
const initialNodes: Node[] = [
  {
    id: "start",
    type: "workflow",
    position: { x: 0, y: 0 },
    data: {
      label: "Incoming Request",
      description: "User input or support ticket",
      icon: "MessageSquare",
      handles: [{ id: "output", type: "source", position: "bottom" }],
      status: "initial",
    },
  },
  {
    id: "triage",
    type: "workflow",
    position: { x: 0, y: 100 },
    data: {
      label: "Triage Agent",
      description: "Analyze and route to appropriate support level",
      icon: "GitBranch",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "l1", type: "source", position: "left" },
        { id: "l2", type: "source", position: "bottom" },
        { id: "l3", type: "source", position: "right" },
      ],
      status: "initial",
    },
  },
  // L1 Support Path
  {
    id: "l1-docs",
    type: "workflow",
    position: { x: -300, y: 200 },
    data: {
      label: "Documentation Search",
      description: "Search knowledge base with Mintlify",
      icon: "BookOpen",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  {
    id: "l1-zendesk",
    type: "workflow",
    position: { x: -300, y: 300 },
    data: {
      label: "Zendesk Ticket",
      description: "Create or update support ticket",
      icon: "Ticket",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  // L2 Support Path
  {
    id: "l2-github",
    type: "workflow",
    position: { x: 0, y: 200 },
    data: {
      label: "GitHub Analysis",
      description: "Check issues, PRs, and codebase",
      icon: "Github",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  {
    id: "l2-codex",
    type: "workflow",
    position: { x: 0, y: 300 },
    data: {
      label: "Code Analysis",
      description: "Analyze code with Codex/GPT",
      icon: "Code",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  {
    id: "l2-slack",
    type: "workflow",
    position: { x: 0, y: 400 },
    data: {
      label: "Team Notification",
      description: "Notify engineering team via Slack",
      icon: "Slack",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  // L3 Support Path
  {
    id: "l3-escalation",
    type: "workflow",
    position: { x: 300, y: 200 },
    data: {
      label: "Escalation Handler",
      description: "Handle critical/complex issues",
      icon: "AlertTriangle",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  {
    id: "l3-intercom",
    type: "workflow",
    position: { x: 300, y: 300 },
    data: {
      label: "Customer Communication",
      description: "Direct customer contact via Intercom",
      icon: "MessageCircle",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  {
    id: "l3-oncall",
    type: "workflow",
    position: { x: 300, y: 400 },
    data: {
      label: "On-Call Alert",
      description: "Page senior engineers for urgent issues",
      icon: "Phone",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    },
  },
  // Response aggregation
  {
    id: "response",
    type: "workflow",
    position: { x: 0, y: 500 },
    data: {
      label: "Response Handler",
      description: "Aggregate results and respond to user",
      icon: "Send",
      handles: [
        { id: "l1-input", type: "target", position: "left" },
        { id: "l2-input", type: "target", position: "top" },
        { id: "l3-input", type: "target", position: "right" },
      ],
      status: "initial",
    },
  },
];

const initialEdges: Edge[] = [
  // Main flow
  { id: "e1", source: "start", target: "triage", type: "workflow" },

  // L1 Support Path
  {
    id: "e2a",
    source: "triage",
    target: "l1-docs",
    type: "workflow",
    sourceHandle: "l1",
  },
  { id: "e3a", source: "l1-docs", target: "l1-zendesk", type: "workflow" },
  {
    id: "e4a",
    source: "l1-zendesk",
    target: "response",
    type: "workflow",
    targetHandle: "l1-input",
  },

  // L2 Support Path
  {
    id: "e2b",
    source: "triage",
    target: "l2-github",
    type: "workflow",
    sourceHandle: "l2",
  },
  { id: "e3b", source: "l2-github", target: "l2-codex", type: "workflow" },
  { id: "e4b", source: "l2-codex", target: "l2-slack", type: "workflow" },
  {
    id: "e5b",
    source: "l2-slack",
    target: "response",
    type: "workflow",
    targetHandle: "l2-input",
  },

  // L3 Support Path
  {
    id: "e2c",
    source: "triage",
    target: "l3-escalation",
    type: "workflow",
    sourceHandle: "l3",
  },
  {
    id: "e3c",
    source: "l3-escalation",
    target: "l3-intercom",
    type: "workflow",
  },
  { id: "e4c", source: "l3-intercom", target: "l3-oncall", type: "workflow" },
  {
    id: "e5c",
    source: "l3-oncall",
    target: "response",
    type: "workflow",
    targetHandle: "l3-input",
  },
];

export default function AgentFlow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isLayouting, setIsLayouting] = useState(false);

  // Apply layout when nodes or edges change
  const applyLayout = useCallback(async () => {
    if (isLayouting || !nodes.length) return;

    setIsLayouting(true);
    const { nodes: layoutedNodes, edges: layoutedEdges } =
      await getLayoutedElements(nodes, edges);

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setIsLayouting(false);

    // Center the view after layout
    if (reactFlowInstance) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 50);
    }
  }, [nodes, edges, isLayouting, setNodes, setEdges, reactFlowInstance]);

  // Initialize with initial nodes and edges
  useEffect(() => {
    const initializeFlow = async () => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        await getLayoutedElements(initialNodes, initialEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    };

    initializeFlow();
  }, [setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection | Edge) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");

      if (typeof type === "undefined" || !type || !reactFlowInstance) {
        return;
      }

      try {
        const nodeData = JSON.parse(
          event.dataTransfer.getData("application/nodeData")
        ) as NodeData;

        // Create node without position (ELK will calculate it)
        const newNode = createNode(type, {
          ...nodeData,
        });

        setNodes((nds) => nds.concat(newNode));
      } catch (error) {
        console.error("Error parsing node data:", error);
      }
    },
    [reactFlowInstance, setNodes]
  );

  const openEditPanel = (data: NodeData) => {
    console.log("Edit node:", data);
    // TODO: Implement edit functionality
  };

  const deleteNode = (nodeId: string) => {
    setNodes((prevNodes) => prevNodes.filter((node) => node.id !== nodeId));
    setEdges((prevEdges) =>
      prevEdges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      )
    );
  };

  const addNode = () => {
    const newNode = createNode("workflow", {
      label: "New Step",
      description: "New workflow step",
      icon: "Plus",
      handles: [
        { id: "input", type: "target", position: "top" },
        { id: "output", type: "source", position: "bottom" },
      ],
      status: "initial",
    });
    setNodes((nds) => nds.concat(newNode));
  };

  const resetFlow = () => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  };

  const exportFlow = () => {
    const flowData = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        data: node.data,
        position: node.position,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
      })),
    };

    const dataStr = JSON.stringify(flowData, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "agent-flow.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="h-full w-full" ref={reactFlowWrapper}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes.map((node) => ({
              ...node,
              data: {
                ...node.data,
                openEditPanel,
                deleteNode,
              },
            }))}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes as unknown as NodeTypes}
            edgeTypes={edgeTypes}
            fitView
            defaultEdgeOptions={{
              type: "workflow",
              selectable: true,
              focusable: true,
            }}
          >
            <Background gap={20} />
            <Controls />
            <Panel position="top-right" className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={addNode}
                className="bg-background"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={applyLayout}
                disabled={isLayouting}
                className="bg-background"
              >
                <RotateCcw
                  className={`h-4 w-4 mr-1 ${isLayouting ? "animate-spin" : ""}`}
                />
                Auto Layout
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={exportFlow}
                className="bg-background"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={resetFlow}
                className="bg-background"
              >
                Reset
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
