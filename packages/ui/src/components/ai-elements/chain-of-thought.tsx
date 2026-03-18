"use client";

import { useControllableState } from "@radix-ui/react-use-controllable-state";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import { cn } from "@workspace/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, memo, useContext, useMemo } from "react";

interface ChainOfThoughtContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const ChainOfThoughtContext = createContext<ChainOfThoughtContextValue | null>(
  null,
);

const useChainOfThought = () => {
  const context = useContext(ChainOfThoughtContext);
  if (!context) {
    throw new Error(
      "ChainOfThought components must be used within ChainOfThought",
    );
  }
  return context;
};

export type ChainOfThoughtProps = ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export const ChainOfThought = memo(
  ({
    className,
    open,
    defaultOpen = false,
    onOpenChange,
    children,
    ...props
  }: ChainOfThoughtProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      defaultProp: defaultOpen,
      onChange: onOpenChange,
      prop: open,
    });

    const chainOfThoughtContext = useMemo(
      () => ({ isOpen, setIsOpen }),
      [isOpen, setIsOpen],
    );

    return (
      <ChainOfThoughtContext.Provider value={chainOfThoughtContext}>
        <div className={cn("not-prose w-full space-y-4", className)} {...props}>
          {children}
        </div>
      </ChainOfThoughtContext.Provider>
    );
  },
);

export type ChainOfThoughtHeaderProps = ComponentProps<
  typeof CollapsibleTrigger
>;

export const ChainOfThoughtHeader = memo(
  ({ className, children, ...props }: ChainOfThoughtHeaderProps) => {
    const { isOpen, setIsOpen } = useChainOfThought();

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger
          className={cn(
            "flex items-center gap-2 text-muted-foreground text-sm transition-colors hover:text-foreground",
            className,
          )}
          {...props}
        >
          <ChevronDownIcon
            className={cn(
              "size-4 transition-transform",
              isOpen ? "rotate-0" : "rotate-180",
            )}
          />
          <span className="flex-1 text-left">
            {children ?? "Chain of Thought"}
          </span>
        </CollapsibleTrigger>
      </Collapsible>
    );
  },
);

export type ChainOfThoughtStepProps = ComponentProps<"div"> & {
  icon?: LucideIcon;
  label: ReactNode;
  description?: ReactNode;
  status?: "complete" | "active" | "pending";
};

const stepStatusStyles = {
  active: "text-foreground",
  complete: "text-muted-foreground",
  pending: "text-muted-foreground/50",
};

const stepStatusDotStyles = {
  complete: "bg-green-500",
  active: "bg-amber-500 animate-pulse",
  pending: "bg-muted-foreground/40",
};

const stepStatusIconStyles = {
  complete: "text-green-600 dark:text-green-400",
  active: "text-amber-600 dark:text-amber-400",
  pending: "text-muted-foreground/50",
};

export const ChainOfThoughtStep = memo(
  ({
    className,
    icon: Icon,
    label,
    description,
    status = "complete",
    children,
    ...props
  }: ChainOfThoughtStepProps) => {
    const hasDetails =
      children != null &&
      (typeof children !== "string" || children.trim() !== "");
    return (
      <div
        className={cn(
          "flex gap-2 text-sm",
          stepStatusStyles[status],
          "fade-in-0 slide-in-from-top-2 animate-in",
          className,
        )}
        {...props}
      >
        <div className="relative mt-0.5 flex flex-col items-center">
          {Icon ? (
            <Icon
              className={cn("size-4 shrink-0", stepStatusIconStyles[status])}
              aria-hidden
            />
          ) : (
            <span
              className={cn(
                "size-2.5 shrink-0 rounded-full ring-2 ring-background",
                stepStatusDotStyles[status],
              )}
              aria-hidden
            />
          )}
          <div className="absolute top-5 bottom-0 left-1/2 -translate-x-px w-px bg-border" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="font-medium">{label}</div>
          {description && (
            <div className="text-muted-foreground text-xs leading-relaxed">
              {description}
            </div>
          )}
          {hasDetails ? (
            <Collapsible defaultOpen={false} className="mt-2 group/step">
              <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors outline-none">
                View details
                <ChevronDownIcon className="size-3.5 transition-transform duration-200 group-data-[state=open]/step:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent
                className={cn(
                  "mt-2 pl-3 border-l-2 border-muted-foreground/20",
                  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2",
                  "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2",
                )}
              >
                <div className="text-muted-foreground text-xs space-y-2">
                  {children}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ) : (
            children
          )}
        </div>
      </div>
    );
  },
);

export type ChainOfThoughtSearchResultsProps = ComponentProps<"div">;

export const ChainOfThoughtSearchResults = memo(
  ({ className, ...props }: ChainOfThoughtSearchResultsProps) => (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      {...props}
    />
  ),
);

export type ChainOfThoughtSearchResultProps = ComponentProps<typeof Badge>;

export const ChainOfThoughtSearchResult = memo(
  ({ className, children, ...props }: ChainOfThoughtSearchResultProps) => (
    <Badge
      className={cn("gap-1 px-2 py-0.5 font-normal text-xs", className)}
      variant="secondary"
      {...props}
    >
      {children}
    </Badge>
  ),
);

export type ChainOfThoughtContentProps = ComponentProps<
  typeof CollapsibleContent
>;

export const ChainOfThoughtContent = memo(
  ({ className, children, ...props }: ChainOfThoughtContentProps) => {
    const { isOpen } = useChainOfThought();

    return (
      <Collapsible open={isOpen}>
        <CollapsibleContent
          className={cn(
            "mt-2 space-y-3",
            "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
            className,
          )}
          {...props}
        >
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  },
);

export type ChainOfThoughtImageProps = ComponentProps<"div"> & {
  caption?: string;
};

export const ChainOfThoughtImage = memo(
  ({ className, children, caption, ...props }: ChainOfThoughtImageProps) => (
    <div className={cn("mt-2 space-y-2", className)} {...props}>
      <div className="relative flex max-h-[22rem] items-center justify-center overflow-hidden rounded-lg bg-muted p-3">
        {children}
      </div>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  ),
);

ChainOfThought.displayName = "ChainOfThought";
ChainOfThoughtHeader.displayName = "ChainOfThoughtHeader";
ChainOfThoughtStep.displayName = "ChainOfThoughtStep";
ChainOfThoughtSearchResults.displayName = "ChainOfThoughtSearchResults";
ChainOfThoughtSearchResult.displayName = "ChainOfThoughtSearchResult";
ChainOfThoughtContent.displayName = "ChainOfThoughtContent";
ChainOfThoughtImage.displayName = "ChainOfThoughtImage";
