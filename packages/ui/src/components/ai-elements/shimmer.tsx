'use client';

import { cn } from '@workspace/ui/lib/utils';
import {
  type CSSProperties,
  type ElementType,
} from 'react';

export type ShimmerProps = {
  children: string;
  as?: ElementType;
  className?: string;
  duration?: number;
};

export const Shimmer = ({
  children,
  as: Component = 'span',
  className,
  duration = 2,
}: ShimmerProps) => {
  return (
    <Component
      className={cn(
        'inline-block animate-shimmer bg-gradient-to-r from-muted-foreground/40 via-foreground to-muted-foreground/40 bg-[length:200%_100%] bg-clip-text text-transparent',
        className,
      )}
      style={
        {
          animationDuration: `${duration}s`,
        } as CSSProperties
      }
    >
      {children}
    </Component>
  );
};

