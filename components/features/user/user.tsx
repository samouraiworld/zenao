"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cva } from "class-variance-authority";
import { profileOptions } from "@/lib/queries/profile";
import { cn } from "@/lib/tailwind";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import Text from "@/components/widgets/texts/text";

interface UserComponentProps {
  realmId: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/*
XXX: these classnames (rounded-full, overflow-hidden) are already set in the shadcn avatar components
but the class merging does not seem to work so we need to reset them here
*/

const avatarClassName = cva("rounded-full overflow-hidden inline-block", {
  variants: {
    size: {
      sm: "w-6 h-6",
      md: `w-12 h-12`,
      lg: "w-24 h-24",
    },
  },
  defaultVariants: { size: "sm" },
});

export function UserAvatar({
  realmId,
  className,
  size = "sm",
}: UserComponentProps) {
  const { data: profile } = useSuspenseQuery(profileOptions(realmId));

  const imgSize = size === "sm" ? 24 : size === "md" ? 48 : 96;
  const imgQuality = size === "sm" ? 60 : size === "md" ? 80 : 90;

  return (
    <Avatar className={cn(avatarClassName({ size }), className)}>
      <AvatarFallback>
        <Web3Image
          src={
            (profile?.avatarUri && profile.avatarUri !== ""
              ? profile.avatarUri
              : undefined) ?? "/zenao-profile.png"
          }
          width={imgSize}
          height={imgSize}
          quality={imgQuality}
          alt="Avatar"
          className="w-full h-full object-cover"
        />
      </AvatarFallback>
    </Avatar>
  );
}

export function UserAvatarSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn(avatarClassName, className)} />;
}

export function UserAvatarWithName({
  realmId,
  className,
  linkToProfile,
  size = "sm",
}: UserComponentProps & {
  linkToProfile?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { data: profile } = useSuspenseQuery(profileOptions(realmId));

  const content = (
    <div className="flex flex-row gap-2 items-center">
      <UserAvatar realmId={realmId} size={size} />
      <Text size="sm">{profile?.displayName}</Text>
    </div>
  );

  if (linkToProfile) {
    return (
      <Link
        href={`/profile/${realmId}`}
        className={cn("flex w-max", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
