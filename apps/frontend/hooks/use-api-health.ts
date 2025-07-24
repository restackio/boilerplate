"use client";

import { useState, useCallback } from "react";
import { runWorkflow, getWorkflowResult } from "@/app/actions/workflow";

// API Health Hook
export function useApiHealth() {
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  const checkHealth = useCallback(async () => {
    try {
      // Try to run a simple workflow to test connectivity
      const { workflowId, runId } = await runWorkflow({
        workflowName: "AgentsReadWorkflow",
        input: {},
      });
      
      // Try to get the result
      await getWorkflowResult({ workflowId, runId });
      
      setIsHealthy(true);
    } catch (error) {
      console.error("API health check failed:", error);
      setIsHealthy(false);
    }
  }, []);

  return {
    isHealthy,
    checkHealth,
  };
} 