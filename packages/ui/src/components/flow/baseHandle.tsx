import { forwardRef } from "react";
import { Handle, HandleProps } from "@xyflow/react";
 
import { cn } from "../../lib/utils";
 
export type BaseHandleProps = HandleProps;
 
export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Handle
        key={props.id}
        ref={ref}
        {...props}
        className={cn(
          "h-[11px] w-[11px] rounded-full border border-slate-300 bg-slate-100 transition dark:border-secondary dark:bg-secondary",
          className,
        )}
        {...props}
      >
        {children}
      </Handle>
    );
  },
) as React.ForwardRefExoticComponent<BaseHandleProps & React.RefAttributes<HTMLDivElement>>;
 
BaseHandle.displayName = "BaseHandle";