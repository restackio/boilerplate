"use client";

import { ConversationItem } from "../types";
import { useConversationItem } from "../hooks/use-conversation-item";
import { ConversationCard } from "./base/ConversationCard";
import { ContentSection, CodeBlock } from "./base/ContentDisplay";

interface TaskCardWebSearchProps {
  item: ConversationItem;
  onClick?: (item: ConversationItem) => void;
}

export function TaskCardWebSearch({ item, onClick }: TaskCardWebSearchProps) {
  const { status, isCompleted, toolOutput } = useConversationItem(item);
  
  const searchQuery = item.openai_output?.action?.query;

  const formatSearchResults = (results: unknown): string => {
    if (typeof results === 'object' && results !== null) {
      if (Array.isArray(results)) {
        return `Found ${results.length} results`;
      }
      if ('results' in results) {
        const resultArray = (results as any).results;
        return `Found ${Array.isArray(resultArray) ? resultArray.length : 'multiple'} results`;
      }
      return "Search completed";
    }
    const str = String(results);
    return str.length > 200 ? str.substring(0, 200) + "..." : str;
  };

  return (
    <ConversationCard
      item={item}
      onClick={onClick}
    >
      {searchQuery && (
        <ContentSection label="Query">
          <CodeBlock content={searchQuery} language="text" />
        </ContentSection>
      )}
      
      {isCompleted && toolOutput && (
        <ContentSection label="Results">
          <div className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border">
            {formatSearchResults(toolOutput)}
          </div>
        </ContentSection>
      )}
    </ConversationCard>
  );
}
