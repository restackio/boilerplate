'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/ui/collapsible';
import { cn } from '@workspace/ui/lib/utils';
import { ChevronDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { Response } from './response';
import { Shimmer } from './shimmer';

type ReasoningContextValue = {
  /** Whether reasoning is in progress (not completed yet) */
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  /** Duration in seconds from backend timestamps */
  duration: number;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);

const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error('Reasoning components must be used within Reasoning');
  }
  return context;
};

export type ReasoningProps = ComponentProps<typeof Collapsible> & {
  /** Whether reasoning is in progress (not completed yet) */
  isStreaming?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Duration in seconds from backend timestamps */
  duration?: number;
};

const AUTO_CLOSE_DELAY = 1000;

export const Reasoning = ({
  className,
  isStreaming = false,
  open,
  defaultOpen = false,
  onOpenChange,
  duration = 0,
  children,
  ...props
}: ReasoningProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    const [hasAutoClosedRef, setHasAutoClosedRef] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);
    const [prevIsStreaming, setPrevIsStreaming] = useState(isStreaming);

    // Reset userInteracted when a new reasoning session starts
    useEffect(() => {
      if (isStreaming && !prevIsStreaming) {
        setUserInteracted(false);
        setHasAutoClosedRef(false);
      }
      setPrevIsStreaming(isStreaming);
    }, [isStreaming, prevIsStreaming]);

    // Auto-open when in progress, auto-close when completed (once only)
    // But respect user interaction - don't auto-open/close if user has manually changed it
    useEffect(() => {
      if (userInteracted) return; // Respect user's manual interaction
      
      if (isStreaming && !isOpen) {
        setIsOpen(true);
      } else if (!isStreaming && isOpen && !defaultOpen && !hasAutoClosedRef) {
        // Add a small delay before closing to allow user to see the content
        const timer = setTimeout(() => {
          setIsOpen(false);
          setHasAutoClosedRef(true);
        }, AUTO_CLOSE_DELAY);
        return () => clearTimeout(timer);
      }
    }, [isStreaming, isOpen, defaultOpen, setIsOpen, hasAutoClosedRef, userInteracted]);

    const handleOpenChange = (newOpen: boolean) => {
      setUserInteracted(true); // Mark that user has manually interacted
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming, isOpen, setIsOpen, duration }}
      >
        <Collapsible
          className={cn('not-prose mb-4', className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
};

export type ReasoningTriggerProps = ComponentProps<
  typeof CollapsibleTrigger
> & {
  title?: string;
};

export const ReasoningTrigger = ({
  className,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  title: _title = 'Reasoning',
  children,
  ...props
}: ReasoningTriggerProps) => {
    const { isStreaming, isOpen, duration } = useReasoning();

    return (
      <CollapsibleTrigger
        className={cn(
          'flex items-center gap-2 text-muted-foreground text-sm',
          className
        )}
        {...props}
      >
      {children ?? (
        <>
          {isStreaming ? (
            <Shimmer duration={2}>Thinking...</Shimmer>
          ) : duration > 0 ? (
            <p>Thought for {duration} seconds</p>
          ) : (
            <p>Thinking</p>
          )}
          <ChevronDownIcon
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              isOpen ? 'rotate-180' : 'rotate-0'
            )}
          />
        </>
      )}
      </CollapsibleTrigger>
    );
};

export type ReasoningContentProps = ComponentProps<
  typeof CollapsibleContent
> & {
  children: string;
};

export const ReasoningContent = ({ className, children, ...props }: ReasoningContentProps) => (
  <CollapsibleContent
    className={cn(
      'mt-4 text-sm',
      'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
      className
    )}
    {...props}
  >
    <Response className="grid gap-2">{children}</Response>
  </CollapsibleContent>
);

Reasoning.displayName = 'Reasoning';
ReasoningTrigger.displayName = 'ReasoningTrigger';
ReasoningContent.displayName = 'ReasoningContent';
