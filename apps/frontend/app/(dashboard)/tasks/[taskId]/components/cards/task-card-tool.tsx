"use client";

import { useState } from "react";
import { ChevronDownIcon } from "lucide-react";

import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";
import { ContentSection, CodeBlock, ToolList } from "@workspace/ui/components";
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@workspace/ui/components/ui/collapsible";
import { Shimmer } from "@workspace/ui/components/ai-elements/shimmer";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/ui/button";

interface TaskCardToolProps {
  item: ConversationItem;
  onClick: (item: ConversationItem) => void;
}

export function TaskCardTool({ item, onClick }: TaskCardToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { toolOutput, isFailed, toolArguments, isCompleted, isPending, toolName } = useConversationItem(item);
  const tools = item.openai_output?.tools;
  const hasError = item.openai_output?.error;
  const duration = typeof item.duration_seconds === 'number' 
    ? item.duration_seconds 
    : undefined;
  
  // Extract output content
  let outputContent = "";
  if (toolOutput) {
    if (hasError) {
      // Format error output more nicely
      const error = toolOutput as { content?: Array<{text?: string}>; message?: string; type?: string; code?: string };
      if (error.content && Array.isArray(error.content)) {
        // Handle structured error content (like workflow errors)
        outputContent = error.content.map((c: {text?: string} | string) => typeof c === 'string' ? c : c.text || '').join('\n');
      } else if (error.message) {
        // Handle simple error messages
        outputContent = `Error (${error.type || 'unknown'}): ${error.message}`;
        if (error.code) {
          outputContent = `Error ${error.code}: ${error.message}`;
        }
      } else {
        // Fallback to JSON representation
        outputContent = typeof error === 'string' ? error : JSON.stringify(error, null, 2);
      }
    } else {
      outputContent = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput, null, 2);
    }
  }

  // Get action description
  const getActionDescription = () => {
    if (item.type === "web_search_call") {
      const query = item.openai_output?.action?.query;
      return query ? `searching "${query}"` : "searching";
    }
    if (tools && tools.length > 0) {
      return `${tools.length} tool${tools.length > 1 ? 's' : ''} available`;
    }
    if (isCompleted) return "completed";
    if (isFailed) return "failed";
    if (isPending) return "processing";
    return "pending";
  };

  // Get output preview (first line or summary)
  const getOutputPreview = () => {
    if (!outputContent || isOpen) return null;
    const firstLine = outputContent.split('\n')[0].trim();
    if (firstLine.length > 60) {
      return ` · ${firstLine.substring(0, 60)}...`;
    }
    return firstLine ? ` · ${firstLine}` : null;
  };

  const outputPreview = getOutputPreview();

  return (
    <Collapsible 
      className="not-prose mb-4" 
      open={isOpen} 
      onOpenChange={setIsOpen}
    >
      <CollapsibleTrigger className="flex items-center gap-2 text-muted-foreground text-sm">
        <p className="flex-1 text-left truncate">
          {isPending ? (
            <Shimmer>{toolName || "Tool"}</Shimmer>
          ) : (
            <span>{toolName || "Tool"}</span>
          )}
          {" · "}
          <span className="opacity-70">{getActionDescription()}</span>
          {outputPreview && <span className="opacity-60">{outputPreview}</span>}
          {duration && duration > 0 && (
            <>
              {" · "}
              <span className="opacity-60">{duration}s</span>
            </>
          )}
        </p>
        <ChevronDownIcon
          className={cn(
            "size-4 text-muted-foreground transition-transform flex-shrink-0",
            isOpen ? "rotate-180" : "rotate-0"
          )}
        />
      </CollapsibleTrigger>
      
      <CollapsibleContent
        className={cn(
          'mt-4 text-sm',
          'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in'
        )}
      >
        <div className="space-y-3 pl-4">
          {toolArguments && (
            <ContentSection label="Arguments">
              <CodeBlock content={typeof toolArguments === 'string' ? toolArguments : JSON.stringify(toolArguments, null, 2)} />
            </ContentSection>
          )}
          {outputContent && (
            <ContentSection label={isFailed ? "Error Details" : "Output"}>
              <CodeBlock 
                content={outputContent} 
                isError={isFailed}
              />
            </ContentSection>
          )}
          {tools && Array.isArray(tools) && (
            <ContentSection label={`Available tools (${tools.length})`}>
              <ToolList tools={tools} />
            </ContentSection>
          )}

          <Button
            size="sm"
            variant="link"
            className="text-xs px-0"
            onClick={(e) => {
              e.stopPropagation();
              onClick(item);
            }}
          >
            View raw data
          </Button>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
} 