import * as React from "react";
import { cn } from "@/shared/lib/utils";
import {
  Avatar as BaseAvatar,
  AvatarBadge as BaseAvatarBadge,
  AvatarFallback as BaseAvatarFallback,
  AvatarGroup as BaseAvatarGroup,
  AvatarGroupCount as BaseAvatarGroupCount,
  AvatarImage as BaseAvatarImage,
} from "@/shared/ui/shadcn/avatar";

type AvatarProps = React.ComponentProps<typeof BaseAvatar>;
type AvatarImageProps = React.ComponentProps<typeof BaseAvatarImage>;
type AvatarFallbackProps = React.ComponentProps<typeof BaseAvatarFallback>;
type AvatarBadgeProps = React.ComponentProps<typeof BaseAvatarBadge>;
type AvatarGroupProps = React.ComponentProps<typeof BaseAvatarGroup>;
type AvatarGroupCountProps = React.ComponentProps<typeof BaseAvatarGroupCount>;

function Avatar({ className, ...props }: AvatarProps) {
  return <BaseAvatar className={cn("ring-1 ring-white/10", className)} {...props} />;
}

function AvatarImage({ className, ...props }: AvatarImageProps) {
  return <BaseAvatarImage className={className} {...props} />;
}

function AvatarFallback({ className, ...props }: AvatarFallbackProps) {
  return <BaseAvatarFallback className={cn("bg-white/10 text-white", className)} {...props} />;
}

function AvatarBadge({ className, ...props }: AvatarBadgeProps) {
  return <BaseAvatarBadge className={className} {...props} />;
}

function AvatarGroup({ className, ...props }: AvatarGroupProps) {
  return <BaseAvatarGroup className={className} {...props} />;
}

function AvatarGroupCount({ className, ...props }: AvatarGroupCountProps) {
  return <BaseAvatarGroupCount className={className} {...props} />;
}

export {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
};
