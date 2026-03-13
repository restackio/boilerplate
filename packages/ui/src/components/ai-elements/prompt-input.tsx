"use client";

import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { ArrowUp, Loader2, Sparkles } from "lucide-react"; // eslint-disable-line @typescript-eslint/no-unused-vars

export interface PromptInputProps {
  /** Current prompt value */
  prompt: string;
  /** Callback when prompt changes */
  onPromptChange: (prompt: string) => void;
  /** Callback when prompt is submitted */
  onSubmit: () => void;
  /** Whether the AI is processing */
  isLoading?: boolean;
  /** Whether the AI is initializing */
  isInitializing?: boolean;
  /** Custom placeholder text */
  placeholder?: string;
  /** Custom loading placeholder */
  loadingPlaceholder?: string;
  /** Custom initializing placeholder */
  initializingPlaceholder?: string;
  /** Whether to show loading spinner */
  showLoadingSpinner?: boolean;
  /** Disable the input */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Min height of textarea */
  minHeight?: string;
  /** Max height of textarea */
  maxHeight?: string;
  /** Show AI indicator icon */
  showAIIndicator?: boolean;
}

export function PromptInput({
  prompt,
  onPromptChange,
  onSubmit,
  isLoading = false,
  isInitializing = false,
  placeholder = "Enter your prompt...",
  loadingPlaceholder = "AI is thinking...",
  initializingPlaceholder = "Initializing AI...",
  disabled = false,
  className = "",
  minHeight = "min-h-[40px]",
  maxHeight = "max-h-[80px]",
}: PromptInputProps) {
  const isDisabled = disabled || isLoading || isInitializing;

  const getPlaceholder = () => {
    if (isInitializing) return initializingPlaceholder;
    if (isLoading) return loadingPlaceholder;
    return placeholder;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isDisabled && prompt.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <div
      className={`max-w-4xl mx-auto border border-border/40 p-2 rounded-lg space-y-2 bg-muted/90 mb-4 ${className} `}
    >
      <div className="flex space-x-2">
        <Textarea
          placeholder={getPlaceholder()}
          value={prompt}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onPromptChange(e.target.value)
          }
          className={`flex-1 bg-background ${minHeight} ${maxHeight} resize-none`}
          onKeyDown={handleKeyDown}
          disabled={isDisabled}
        />

        <Button
          onClick={onSubmit}
          disabled={!prompt.trim() || isDisabled}
          className="p-5"
          size="icon"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
