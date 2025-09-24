'use client';

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Badge } from '@workspace/ui/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@workspace/ui/components/ui/collapsible';
import { cn } from '@workspace/ui/lib/utils';
import {
  ChevronDownIcon,
  Globe,
  Search,
  Eye,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import type { ComponentProps } from 'react';
import { createContext, memo, useContext } from 'react';

type WebSearchContextValue = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  actionType: 'web_search' | 'open_page' | 'find_in_page';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  isStreaming: boolean;
};

const WebSearchContext = createContext<WebSearchContextValue | null>(null);

const useWebSearch = () => {
  const context = useContext(WebSearchContext);
  if (!context) {
    throw new Error('WebSearch components must be used within WebSearch');
  }
  return context;
};

export type WebSearchProps = ComponentProps<'div'> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  actionType?: 'web_search' | 'open_page' | 'find_in_page';
  status?: 'pending' | 'in-progress' | 'completed' | 'failed';
  isStreaming?: boolean;
};

export const WebSearch = memo(
  ({
    className,
    open,
    defaultOpen = true,
    onOpenChange,
    actionType = 'web_search',
    status = 'pending',
    isStreaming = false,
    children,
    ...props
  }: WebSearchProps) => {
    const [isOpen, setIsOpen] = useControllableState({
      prop: open,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    });

    return (
      <WebSearchContext.Provider 
        value={{ isOpen, setIsOpen, actionType, status, isStreaming }}
      >
        <div
          className={cn(
            'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out data-[state=open]:animate-in',
            className
          )}
          {...props}
        >
          {children}
        </div>
      </WebSearchContext.Provider>
    );
  },
);

export type WebSearchTriggerProps = ComponentProps<typeof CollapsibleTrigger>;

export const WebSearchTrigger = memo(
  ({ className, children, ...props }: WebSearchTriggerProps) => {
    const { isOpen, setIsOpen, actionType, status, isStreaming } = useWebSearch();

    const getActionDetails = () => {
      switch (actionType) {
        case 'open_page':
          return {
            icon: ExternalLink,
            label: 'Opening page',
            color: 'blue'
          };
        case 'find_in_page':
          return {
            icon: Eye,
            label: 'Finding in page',
            color: 'purple'
          };
        case 'web_search':
        default:
          return {
            icon: Search,
            label: 'Web search',
            color: 'green'
          };
      }
    };

    const actionDetails = getActionDetails();
    const isActive = isStreaming || status === 'in-progress';
    const isFailed = status === 'failed';

    return (
      <Collapsible onOpenChange={setIsOpen} open={isOpen}>
        <CollapsibleTrigger
          className={cn(
            'flex w-full cursor-pointer items-center gap-3 text-muted-foreground hover:text-foreground group',
            className,
          )}
          {...props}
        >
          {children ?? (
            <>
              <div className="flex items-center gap-2">                
                <div className="flex items-center gap-2">
                  <p className="text-sm">
                    {isActive ? actionDetails.label.replace(/ing$/, 'ing...') : 
                     isFailed ? `Failed to ${actionDetails.label.toLowerCase()}` :
                     actionDetails.label}
                  </p>
                </div>
              </div>
              
              <ChevronDownIcon className="size-4 transition-transform group-data-[state=open]:rotate-180" />
            </>
          )}
        </CollapsibleTrigger>
      </Collapsible>
    );
  },
);

export type WebSearchContentProps = ComponentProps<typeof CollapsibleContent>;

export const WebSearchContent = memo(
  ({ className, children, ...props }: WebSearchContentProps) => {
    const { isOpen } = useWebSearch();

    return (
      <Collapsible open={isOpen}>
        <CollapsibleContent
          className={cn(
            'mt-4 space-y-3 border-muted border-l-2 pl-4',
            'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-popover-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in',
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

export type WebSearchDetailProps = ComponentProps<'div'> & {
  label: string;
};

export const WebSearchDetail = memo(
  ({ className, label, children, ...props }: WebSearchDetailProps) => (
    <div className={cn('text-muted-foreground text-sm', className)} {...props}>
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}:</span>
        {children}
      </div>
    </div>
  ),
);

export type WebSearchUrlProps = ComponentProps<'div'> & {
  url: string;
};

export const WebSearchUrl = memo(
  ({ className, url, ...props }: WebSearchUrlProps) => (
    <div 
      className={cn('inline-flex items-center gap-1 rounded-md border bg-secondary px-2 py-1 text-foreground text-xs', className)} 
      {...props}
    >
      <Globe className="h-3 w-3" />
      <Link 
        href={url} 
        target="_blank" 
        className="hover:underline max-w-[300px] truncate"
      >
        {url}
      </Link>
    </div>
  ),
);

export type WebSearchQueryProps = ComponentProps<'span'> & {
  query: string;
};

export const WebSearchQuery = memo(
  ({ className, query, ...props }: WebSearchQueryProps) => (
    <span 
      className={cn('bg-muted px-2 py-1 rounded text-xs font-mono', className)} 
      {...props}
    >
      {query}
    </span>
  ),
);

export type WebSearchStatusProps = ComponentProps<'div'>;

export const WebSearchStatus = memo(
  ({ className, ...props }: WebSearchStatusProps) => {
    const { status } = useWebSearch();

    if (status === 'pending') return null;

    return (
      <div className={cn('text-muted-foreground text-sm', className)} {...props}>
        <div className="flex items-center gap-2">
          <span className="font-medium">Status:</span>
          <Badge 
            variant={status === 'failed' ? "destructive" : status === 'completed' ? "secondary" : "outline"}
            className="text-xs"
          >
            {status}
          </Badge>
        </div>
      </div>
    );
  },
);

export type WebSearchResultsProps = ComponentProps<'div'> & {
  count?: number;
  summary?: string;
  hasContent?: boolean;
};

export const WebSearchResults = memo(
  ({ className, count, summary, hasContent, ...props }: WebSearchResultsProps) => {
    if (!summary) return null;

    return (
      <div className={cn('text-muted-foreground text-sm border-t border-muted pt-2', className)} {...props}>
        <div className="flex items-center gap-2">
          <span className="font-medium">Results:</span>
          <div className="flex items-center gap-2">
            <span>{summary}</span>
            {hasContent && count !== undefined && count > 0 && (
              <Badge variant="outline" className="text-xs">
                {count} items
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export type WebSearchDebugProps = ComponentProps<'div'> & {
  onDebugClick?: () => void;
};

export const WebSearchDebug = memo(
  ({ className, onDebugClick, ...props }: WebSearchDebugProps) => (
    <div className={cn('border-t border-muted pt-2', className)} {...props}>
      <Link 
        href="#" 
        className="text-xs text-muted-foreground hover:text-foreground" 
        onClick={(e) => {
          e.preventDefault();
          onDebugClick?.();
        }}
      >
        View debug data
      </Link>
    </div>
  ),
);

// Display names for better debugging
WebSearch.displayName = 'WebSearch';
WebSearchTrigger.displayName = 'WebSearchTrigger';
WebSearchContent.displayName = 'WebSearchContent';
WebSearchDetail.displayName = 'WebSearchDetail';
WebSearchUrl.displayName = 'WebSearchUrl';
WebSearchQuery.displayName = 'WebSearchQuery';
WebSearchStatus.displayName = 'WebSearchStatus';
WebSearchResults.displayName = 'WebSearchResults';
WebSearchDebug.displayName = 'WebSearchDebug';
