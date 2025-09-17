"use client";

import { ConversationItem } from "../../types";
import { useConversationItem } from "../../hooks/use-conversation-item";
import { ConversationCard } from "./conversation-card";
import { ContentSection, CodeBlock, ToolList } from "@workspace/ui/components";

interface TaskCardToolProps {
  item: ConversationItem;
  onClick: (item: ConversationItem) => void;
}

export function TaskCardTool({ item, onClick }: TaskCardToolProps) {
  const { toolOutput, isFailed, toolArguments } = useConversationItem(item);
  const tools = item.openai_output?.tools;
  const hasError = item.openai_output?.error;
  
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
  
  return (
    <ConversationCard
      item={item}
      onClick={onClick}
      showChevron={true}
    >
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
    </ConversationCard>
  );
} 