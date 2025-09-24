"use client";

import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";
import {
  WebSearch,
  WebSearchTrigger,
  WebSearchContent,
  WebSearchDetail,
  WebSearchUrl,
  WebSearchQuery,
  WebSearchStatus,
  WebSearchResults,
  WebSearchDebug,
} from "../web-search";

interface TaskCardWebSearchProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardWebSearch({ item, onClick }: TaskCardWebSearchProps) {
  const { isCompleted, toolOutput, status, isFailed } = useConversationItem(item);

  const isStreaming = item.isStreaming;
  
  // Enhanced action parsing to handle different web search action types
  const action = item.openai_output?.action;
  const actionType = (action?.type as 'web_search' | 'open_page' | 'find_in_page') || 'web_search';
  const searchQuery = action?.query || action?.pattern || 
                     (typeof action === 'string' ? action : null);
  const targetUrl = action?.url;
  
  // Determine if this is a searching state (different from streaming)
  const isSearching = status === 'in-progress' || item.openai_event?.type === 'response.web_search_call.searching';
  
  // Map status to component status
  const componentStatus = isFailed ? 'failed' : 
                         isCompleted ? 'completed' : 
                         (isStreaming || isSearching) ? 'in-progress' : 'pending';
  
  // Extract site-specific search details
  const extractSearchDetails = (query: string) => {
    const siteMatch = query.match(/site:([^\s]+)/);
    const targetSite = siteMatch ? siteMatch[1] : null;
    const cleanQuery = query.replace(/site:[^\s]+\s*/, '').trim();
    
    return {
      targetSite,
      cleanQuery: cleanQuery || query,
      isTargetedSearch: !!targetSite
    };
  };

  const searchDetails = searchQuery && typeof searchQuery === 'string' ? extractSearchDetails(searchQuery) : null;

  const formatSearchResults = (results: unknown): { count: number; summary: string; hasContent: boolean } => {
    if (typeof results === 'object' && results !== null) {
      if (Array.isArray(results)) {
        return { 
          count: results.length, 
          summary: `Found ${results.length} result${results.length !== 1 ? 's' : ''}`,
          hasContent: results.length > 0
        };
      }
      if ('results' in results) {
        const resultArray = (results as { results: unknown }).results;
        const count = Array.isArray(resultArray) ? resultArray.length : 0;
        return { 
          count, 
          summary: `Found ${count} result${count !== 1 ? 's' : ''}`,
          hasContent: count > 0
        };
      }
      return { count: 0, summary: "Search completed", hasContent: false };
    }
    const str = String(results);
    const hasContent = str.length > 0 && str.trim() !== '';
    return { 
      count: 0, 
      summary: hasContent ? (str.length > 200 ? str.substring(0, 200) + "..." : str) : "No results found",
      hasContent
    };
  };

  const resultData = isCompleted && toolOutput ? formatSearchResults(toolOutput) : null;

  return (
    <WebSearch
      actionType={actionType}
      status={componentStatus}
      isStreaming={isStreaming || isSearching}
      defaultOpen={true}
    >
      <WebSearchTrigger />
      
      <WebSearchContent>
        {/* URL for open_page and find_in_page actions */}
        {targetUrl && (
          <WebSearchDetail label="URL">
            <WebSearchUrl url={String(targetUrl)} />
          </WebSearchDetail>
        )}

        {/* Query/Pattern for search and find_in_page actions */}
        {searchQuery && (
          <WebSearchDetail label={actionType === 'find_in_page' ? 'Pattern' : 'Query'}>
            <WebSearchQuery query={String(searchQuery)} />
          </WebSearchDetail>
        )}

        {/* Site-specific search details for web_search */}
        {actionType === 'web_search' && searchDetails && searchDetails.isTargetedSearch && searchDetails.targetSite && (
          <WebSearchDetail label="Target site">
            <WebSearchUrl url={`https://${searchDetails.targetSite}`} />
          </WebSearchDetail>
        )}

        {/* Status indicator */}
        <WebSearchStatus />
        
        {/* Results */}
        {resultData && (
          <WebSearchResults
            count={resultData.count}
            summary={resultData.summary}
            hasContent={resultData.hasContent}
          />
        )}

        {/* Debug link */}
        <WebSearchDebug onDebugClick={() => onClick?.(item)} />
      </WebSearchContent>
    </WebSearch>
  );
}
