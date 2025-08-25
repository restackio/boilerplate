"use client";

import { ConversationItem } from "../types";
import { useConversationItem } from "../hooks/use-conversation-item";
import { ConversationCard } from "./base/ConversationCard";
import { ContentSection, CodeBlock, ToolList } from "./base/ContentDisplay";

interface TaskCardToolProps {
  item: ConversationItem;
  onClick: (item: ConversationItem) => void;
}

export function TaskCardTool({ item, onClick }: TaskCardToolProps) {
  const { toolOutput } = useConversationItem(item);
  const tools = item.openai_output?.tools;
  
  // Extract output content
  let outputContent = "";
  if (toolOutput) {
    outputContent = typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput, null, 2);
  }
  
  return (
    <ConversationCard
      item={item}
      onClick={onClick}
      showChevron={true}
    >
      {outputContent && (
        <ContentSection label="Output">
          <CodeBlock content={outputContent} />
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