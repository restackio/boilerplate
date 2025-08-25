"use client";

import { ConversationItem } from "../types";
import { useConversationItem } from "../hooks/use-conversation-item";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@workspace/ui/components/ui/collapsible";
import { ChevronDownIcon, Globe } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";

interface TaskCardWebSearchProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardWebSearch({ item, onClick }: TaskCardWebSearchProps) {
  const { isCompleted, toolOutput } = useConversationItem(item);

  const isStreaming = item.isStreaming;
  
  const searchQuery = item.openai_output?.action?.query || 
                    item.openai_output?.action || 
                    (typeof item.openai_output?.action === 'object' ? 
                      (item.openai_output.action as Record<string, unknown>)?.query : null);
  
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

  const formatSearchResults = (results: unknown): { count: number; summary: string } => {
    if (typeof results === 'object' && results !== null) {
      if (Array.isArray(results)) {
        return { count: results.length, summary: `Found ${results.length} results` };
      }
      if ('results' in results) {
        const resultArray = (results as { results: unknown }).results;
        const count = Array.isArray(resultArray) ? resultArray.length : 0;
        return { count, summary: `Found ${count} results` };
      }
      return { count: 0, summary: "Search completed" };
    }
    const str = String(results);
    return { 
      count: 0, 
      summary: str.length > 200 ? str.substring(0, 200) + "..." : str 
    };
  };

  const resultData = isCompleted && toolOutput ? formatSearchResults(toolOutput) : null;

  return (
    <Collapsible
      defaultOpen={true}
      className={cn(
        "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=open]:animate-in"
      )}
    >
      <CollapsibleTrigger asChild className="group">
        <div 
          className="flex cursor-pointer items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <>
            {isStreaming ? (
              <p className="text-sm">Searching web...</p>
            ) : isCompleted ? (
              <p className="text-sm">Search web</p>
            ) : null}
             <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </>
          
         
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in"
        )}
      >
        <div className="mt-4 space-y-2 border-muted border-l-2 pl-4">
          {/* Search details */}
          {searchDetails && (
            <div className="text-muted-foreground text-sm space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Query:</span>
                <span>{searchDetails.cleanQuery}</span>
              </div>
              
              {searchDetails.isTargetedSearch && searchDetails.targetSite && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Website:</span>
                  <div className="inline-flex items-center gap-1 rounded-md border bg-secondary px-1.5 py-0.5 text-foreground text-xs">
                    <Globe className="h-3 w-3" />
                    <Link href={`https://${searchDetails.targetSite}`} target="_blank">{searchDetails.targetSite}</Link>
                  </div>
                </div>
              )}
              
              {/* open debug onClick */}
              <Link href="#" className="hover:underline" onClick={() => onClick?.(item)}>More details</Link>
            </div>
          )}
          
          {/* Results */}
          {resultData && (
            <div className="text-muted-foreground text-sm">
              <span className="font-medium">Results:</span>
              <span className="ml-2">{resultData.summary}</span>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
