"use client";

import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkExtendedEdge, ElkNode, ElkPort } from "elkjs/lib/elk-api.js";
import type { Node, Edge } from "@xyflow/react";

// Initialize ELK
const elk = new ELK();

// Enhanced ELK layout options for complex flows
const elkOptionsBase = {
  "elk.algorithm": "layered",

  // Improved spacing for better readability
  "elk.layered.spacing.nodeNodeBetweenLayers": "100",
  "elk.layered.spacing.edgeNodeBetweenLayers": "80",
  "elk.layered.spacing.edgeEdgeBetweenLayers": "40",
  "elk.layered.spacing.nodeEdgeBetweenLayers": "60",
  "elk.spacing.nodeNode": "80",

  // Enable better edge routing
  "elk.edgeRouting": "SPLINES",

  // Optimize for parallel branches
  "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  "elk.layered.nodePlacement.favorStraightEdges": "true",
  "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",

  // Handle separate components better
  "elk.separateConnectedComponents": "false",
  "elk.alignment": "CENTER",

  // Additional optimizations
  "elk.layered.unnecessaryBendpoints": "false",
  "elk.layered.mergeEdges": "false",
  "elk.layered.mergeHierarchyEdges": "false",
  "elk.hierarchyHandling": "INCLUDE_CHILDREN",
  "elk.cycleBreaking.strategy": "DEPTH_FIRST",

  // Layout dimensions
  "elk.aspectRatio": "1.0", // More balanced layout
  "elk.padding": "[top=60,left=60,bottom=60,right=60]",

  // Simplified port handling
  "elk.portConstraints": "FREE",

  // Interactive layout
  "elk.interactive": "true",
  "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
} as const;

const elkOptionsDown = {
  ...elkOptionsBase,
  "elk.direction": "DOWN",
};

// Convert React Flow nodes and edges to ELK format with enhanced configuration
function toElkGraph(
  nodes: Node[],
  edges: Edge[],
  layoutOptions: Record<string, string>,
) {
  return {
    id: "root",
    layoutOptions,
    children: nodes.map((node) => {
      // Determine node size based on content
      const baseWidth = 180;
      const baseHeight = 70;

      // Adjust size for triage node (central branching node)
      const isTriage = node.id === "triage";
      const width = isTriage ? baseWidth + 40 : baseWidth;
      const height = isTriage ? baseHeight + 20 : baseHeight;

      return {
        id: node.id,
        width,
        height,
        // Simplified - let ELK handle ports automatically
        ports: [] as ElkPort[],
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      sections: [],
    })) as ElkExtendedEdge[],
  } as ElkNode;
}

async function applyElkLayout(
  nodes: Node[],
  edges: Edge[],
  layoutOptions: Record<string, string>,
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  if (!nodes.length) return { nodes, edges };

  try {
    const elkGraph = toElkGraph(nodes, edges, layoutOptions);
    const layoutedGraph = await elk.layout(elkGraph);

    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
        return {
          ...node,
          position: {
            x: elkNode.x,
            y: elkNode.y,
          },
          ...(elkNode.width &&
            elkNode.height && {
              width: elkNode.width,
              height: elkNode.height,
            }),
        };
      }
      return node;
    });

    return { nodes: layoutedNodes, edges };
  } catch (error) {
    console.error("ELK layout error:", error);
    return { nodes, edges };
  }
}

// Apply ELK layout to React Flow nodes with enhanced positioning (top-to-bottom)
export const getLayoutedElements = async (nodes: Node[], edges: Edge[]) =>
  applyElkLayout(nodes, edges, elkOptionsDown);

// Left-to-right layout for pattern / flow diagrams (agent → dataset → view)
export const getLayoutedElementsHorizontal = async (
  nodes: Node[],
  edges: Edge[],
) =>
  applyElkLayout(nodes, edges, {
    ...elkOptionsBase,
    "elk.direction": "RIGHT",
    "elk.layered.spacing.nodeNodeBetweenLayers": "220",
    "elk.layered.spacing.edgeNodeBetweenLayers": "160",
  });

// Create nodes with better default positioning
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createNode = (type: string, data: any) => {
  return {
    id: `${type}-${Date.now()}`,
    type,
    // Position will be calculated by ELK
    position: { x: 0, y: 0 },
    data,
    // Add default dimensions
    width: 180,
    height: 70,
  };
};
