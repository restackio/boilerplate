import { forwardRef, HTMLAttributes, ReactNode } from "react";
import { EllipsisVertical } from "lucide-react";

import { cn } from "../../lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { Button } from "../ui/button";
import { ComponentProps } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "../ui/dropdown-menu";

/* NODE HEADER -------------------------------------------------------------- */

export type NodeHeaderProps = HTMLAttributes<HTMLElement>;

/**
 * A container for a consistent header layout intended to be used inside the
 * `<BaseNode />` component.
 */
export const NodeHeader = forwardRef<HTMLElement, NodeHeaderProps>(
  ({ className, ...props }, ref) => {
    return (
      <header
        ref={ref}
        {...props}
        className={cn(
          "flex items-center justify-between gap-2 p-2",
          // Remove or modify these classes if you modify the padding in the
          // `<BaseNode />` component.
          className
        )}
      />
    );
  }
);

NodeHeader.displayName = "NodeHeader";

/* NODE HEADER TITLE -------------------------------------------------------- */

export type NodeHeaderTitleProps = HTMLAttributes<HTMLHeadingElement> & {
  asChild?: boolean;
};

/**
 * The title text for the node. To maintain a native application feel, the title
 * text is not selectable.
 */
export const NodeHeaderTitle = forwardRef<
  HTMLHeadingElement,
  NodeHeaderTitleProps
>(({ className, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "h2";

  return (
    <Comp
      ref={ref}
      {...props}
      className={cn(className, "user-select-none flex-1 font-medium text-xs")}
    />
  );
});

NodeHeaderTitle.displayName = "NodeHeaderTitle";

/* NODE HEADER ICON --------------------------------------------------------- */

export type NodeHeaderIconProps = HTMLAttributes<HTMLSpanElement>;

export const NodeHeaderIcon = forwardRef<HTMLSpanElement, NodeHeaderIconProps>(
  ({ className, ...props }, ref) => {
    return (
      <span ref={ref} {...props} className={cn(className, "[&>*]:size-4")} />
    );
  }
);

NodeHeaderIcon.displayName = "NodeHeaderIcon";

/* NODE HEADER ACTIONS ------------------------------------------------------ */

export type NodeHeaderActionsProps = HTMLAttributes<HTMLDivElement>;

/**
 * A container for right-aligned action buttons in the node header.
 */
export const NodeHeaderActions = forwardRef<
  HTMLDivElement,
  NodeHeaderActionsProps
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        "ml-auto flex items-center gap-1 justify-self-end",
        className
      )}
    />
  );
});

NodeHeaderActions.displayName = "NodeHeaderActions";

/* NODE HEADER ACTION ------------------------------------------------------- */

export type NodeHeaderActionProps = ComponentProps<typeof Button> & {
  label: string;
};

/**
 * A thin wrapper around the `<Button />` component with a fixed sized suitable
 * for icons.
 *
 * Because the `<NodeHeaderAction />` component is intended to render icons, it's
 * important to provide a meaningful and accessible `label` prop that describes
 * the action.
 */
export const NodeHeaderAction = forwardRef<
  HTMLButtonElement,
  NodeHeaderActionProps
>(({ className, label, title, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant="ghost"
      aria-label={label}
      title={title ?? label}
      className={cn(className, "nodrag size-6 p-1")}
      onClick={(event) => {
        event.stopPropagation();
      }}
      {...props}
    />
  );
});

NodeHeaderAction.displayName = "NodeHeaderAction";

//

export type NodeHeaderMenuActionProps = Omit<
  NodeHeaderActionProps,
  "onClick"
> & {
  trigger?: ReactNode;
};

/**
 * Renders a header action that opens a dropdown menu when clicked. The dropdown
 * trigger is a button with an ellipsis icon. The trigger's content can be changed
 * by using the `trigger` prop.
 *
 * Any children passed to the `<NodeHeaderMenuAction />` component will be rendered
 * inside the dropdown menu. You can read the docs for the shadcn dropdown menu
 * here: https://ui.shadcn.com/docs/components/dropdown-menu
 *
 */
export const NodeHeaderMenuAction = forwardRef<
  HTMLButtonElement,
  NodeHeaderMenuActionProps
>(({ trigger, children, ...props }, ref) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <NodeHeaderAction ref={ref} {...props}>
          {trigger ?? <EllipsisVertical />}
        </NodeHeaderAction>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
});

NodeHeaderMenuAction.displayName = "NodeHeaderMenuAction";
