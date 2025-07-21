"use client";

import ELK from "elkjs/lib/elk.bundled.js";
import type { Node, Edge } from "@xyflow/react";

// Initialize ELK
const elk = new ELK();

// Enhanced ELK layout options for complex flows
const elkOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",

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
};

// Convert React Flow nodes and edges to ELK format with enhanced configuration
const toElkGraph = (nodes: Node[], edges: Edge[]) => {
  return {
    id: "root",
    layoutOptions: elkOptions,
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
        ports: [],
      };
    }),
    edges: edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
      sections: [],
    })),
  };
};

// Apply ELK layout to React Flow nodes with enhanced positioning
export const getLayoutedElements = async (nodes: Node[], edges: Edge[]) => {
  if (!nodes.length) return { nodes, edges };

  try {
    const elkGraph = toElkGraph(nodes, edges);
    const layoutedGraph = await elk.layout(elkGraph);

    // Apply the layout to the nodes with improved positioning
    const layoutedNodes = nodes.map((node) => {
      const elkNode = layoutedGraph.children?.find((n) => n.id === node.id);
      if (elkNode && elkNode.x !== undefined && elkNode.y !== undefined) {
        return {
          ...node,
          position: {
            x: elkNode.x,
            y: elkNode.y,
          },
          // Update node dimensions if they were adjusted
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
    // Return original layout if ELK fails
    return { nodes, edges };
  }
};

// Create nodes with better default positioning
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
