"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useDatabaseWorkspace } from "@/lib/database-workspace-context";
import { getAnalytics } from "@/app/actions/analytics";

import { AgentStatusBadge, type AgentStatus } from "@workspace/ui/components/agent-status-badge";
import { CenteredLoading } from "@workspace/ui/components/loading-states";
import { EmptyState } from "@workspace/ui/components/empty-state";

// Types for agent version history
interface AgentVersion {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
  parent_agent_id?: string;
  metrics?: {
    totalTasks: number;
    avgFailRate: number;
    avgDuration: number;
    avgCost: number;
    feedbackPassRate: number;
  };
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface RawAgent {
  id: string;
  name: string;
  description?: string;
  status: AgentStatus;
  created_at?: string;
  updated_at?: string;
  parent_agent_id?: string;
}

interface AgentVersionsTabProps {
  agentId: string;
  getAgentVersions: (agentId: string) => Promise<ApiResponse<RawAgent[]>>;
}

export function AgentVersionsTab({ agentId, getAgentVersions }: AgentVersionsTabProps) {
  const { currentWorkspaceId } = useDatabaseWorkspace();
  
  // Agent versions state
  const [agentVersions, setAgentVersions] = useState<AgentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Fetch metrics for a version
  const fetchVersionMetrics = useCallback(async (versionId: string) => {
    if (!currentWorkspaceId) return null;
    
    try {
      const analytics = await getAnalytics({
        workspaceId: currentWorkspaceId,
        agentId: versionId,
        dateRange: "30d", // Last 30 days for version metrics
      });

      const totalTasks = analytics.overview?.timeseries.reduce((sum, d) => sum + d.taskCount, 0) || 0;
      const avgFailRate = analytics.overview?.timeseries.length 
        ? analytics.overview.timeseries.reduce((sum, d) => sum + d.failRate, 0) / analytics.overview.timeseries.length 
        : 0;
      
      const avgDuration = analytics.performance?.summary?.avgDuration || 0;
      const avgCost = analytics.performance?.summary?.totalCost || 0;
      
      // Calculate feedback pass rate from timeseries data
      const feedbackData = analytics.feedback?.timeseries || [];
      const totalPositive = feedbackData.reduce((sum, d) => sum + (d.positiveCount || 0), 0);
      const totalFeedback = feedbackData.reduce((sum, d) => sum + (d.feedbackCount || 0), 0);
      const feedbackPassRate = totalFeedback > 0 ? (totalPositive / totalFeedback) * 100 : 0;

      return {
        totalTasks,
        avgFailRate,
        avgDuration,
        avgCost,
        feedbackPassRate: feedbackPassRate / 100, // Convert to decimal
      };
    } catch (error) {
      console.error(`Error fetching metrics for version ${versionId}:`, error);
      return null;
    }
  }, [currentWorkspaceId]);

  // Fetch agent versions when component mounts
  useEffect(() => {
    const fetchAgentVersions = async () => {
      if (!agentId) return;
      
      setVersionsLoading(true);
      try {
        const result = await getAgentVersions(agentId);
        if (result.success && result.data) {
          // Convert Agent[] to AgentVersion[] format
          const versions: AgentVersion[] = result.data.map((agent: RawAgent) => ({
            id: agent.id,
            name: agent.name,
            description: agent.description || "",
            status: agent.status,
            created_at: agent.created_at || "",
            updated_at: agent.updated_at || "",
            parent_agent_id: agent.parent_agent_id,
          }));
          
          // Fetch metrics for each version
          const versionsWithMetrics = await Promise.all(
            versions.map(async (version) => {
              const metrics = await fetchVersionMetrics(version.id);
              return { ...version, metrics: metrics || undefined };
            })
          );
          
          setAgentVersions(versionsWithMetrics);
        } else {
          console.error("Failed to fetch agent versions:", result.error);
          setAgentVersions([]);
        }
      } catch (error) {
        console.error("Error fetching agent versions:", error);
        setAgentVersions([]);
      } finally {
        setVersionsLoading(false);
      }
    };

    fetchAgentVersions();
  }, [agentId, getAgentVersions, currentWorkspaceId, fetchVersionMetrics]);

  // Format large numbers with K/M suffixes
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Helper to render metric with percentage comparison vs previous version
  const renderMetricComparison = (current: number | undefined, prev: number | undefined, format: (n: number) => string, higher_is_better = true) => {
    if (current === undefined) {
      return <span className="text-muted-foreground text-xs">—</span>;
    }
    
    const formattedCurrent = format(current);
    
    if (prev === undefined || prev === 0) {
      return <span className="font-medium">{formattedCurrent}</span>;
    }
    
    const percentChange = ((current - prev) / prev) * 100;
    const isImprovement = higher_is_better ? percentChange > 0 : percentChange < 0;
    const isNeutral = percentChange === 0;
    const color = isNeutral ? "text-muted-foreground" : (isImprovement ? "text-green-600" : "text-red-600");
    const sign = percentChange > 0 ? "+" : "";
    
    return (
      <div className="flex flex-col items-end">
        <span className="font-medium">{formattedCurrent}</span>
        <span className={`text-xs ${color}`}>
          {sign}{percentChange.toFixed(1)}%
        </span>
      </div>
    );
  };

  return (

        <div className="space-y-4">
          {versionsLoading ? (
            <CenteredLoading message="Loading versions..." />
          ) : agentVersions.length === 0 ? (
            <EmptyState
              title="No versions found"
              description="Create a new version using the Save button"
            />
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Version</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Created</th>
                    <th className="text-right p-3 font-medium">Tasks</th>
                    <th className="text-right p-3 font-medium">Fail Rate</th>
                    <th className="text-right p-3 font-medium">Latency (ms)</th>
                    <th className="text-right p-3 font-medium">Cost</th>
                    <th className="text-right p-3 font-medium">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {agentVersions.map((version, idx) => {
                    const prevVersion = idx < agentVersions.length - 1 ? agentVersions[idx + 1] : undefined;
                    
                    return (
                      <tr 
                        key={version.id} 
                        className="border-b hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3">
                          <Link 
                            href={`/agents/${version.id}`}
                            className="block hover:underline"
                          >
                            <div className="font-mono text-sm font-medium">
                              {version.id.slice(-12)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate max-w-xs">
                              {version.description}
                            </div>
                          </Link>
                        </td>
                        <td className="p-3">
                          <AgentStatusBadge status={version.status} size="sm" />
                        </td>
                        <td className="p-3">
                          <div className="text-sm text-muted-foreground">
                            {new Date(version.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm">
                            {version.metrics?.totalTasks !== undefined ? (
                              <span className="font-medium">
                                {formatNumber(version.metrics.totalTasks)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm">
                            {renderMetricComparison(
                              version.metrics?.avgFailRate,
                              prevVersion?.metrics?.avgFailRate,
                              (n) => `${(n * 100).toFixed(1)}%`,
                              false // Lower is better
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm">
                            {renderMetricComparison(
                              version.metrics?.avgDuration,
                              prevVersion?.metrics?.avgDuration,
                              (n) => formatNumber(Math.round(n)),
                              false // Lower is better
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm">
                            {renderMetricComparison(
                              version.metrics?.avgCost,
                              prevVersion?.metrics?.avgCost,
                              (n) => `$${n.toFixed(4)}`,
                              false // Lower is better
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="text-sm">
                            {renderMetricComparison(
                              version.metrics?.feedbackPassRate,
                              prevVersion?.metrics?.feedbackPassRate,
                              (n) => `${(n * 100).toFixed(1)}%`
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
  );
} 