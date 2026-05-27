"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { cva } from "class-variance-authority";
import { profileOptions } from "@/lib/queries/profile";
import { cn } from "@/lib/tailwind";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Avatar, AvatarFallback } from "@/components/shadcn/avatar";
import Text from "@/components/widgets/texts/text";

interface UserComponentProps {
  userId: string | null | undefined;
  className?: string;
  size?: "sm" | "md" | "lg";
}

/*
XXX: these classnames (rounded-full, overflow-hidden) are already set in the shadcn avatar components
but the class merging does not seem to work so we need to reset them here
*/
const loaderTextClassName = cva("rounded overflow-hidden inline-block", {
  variants: {
    size: {
      sm: "w-40 h-4",
      md: `w-80 h-8`,
      lg: "w-160 h-16",
    },
  },
  defaultVariants: { size: "sm" },
});

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
  userId,
  className,
  size = "sm",
}: UserComponentProps) {
  const { data: profile } = useSuspenseQuery(profileOptions(userId));
  const tImages = useTranslations("images");

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
          alt={tImages("avatar")}
          className="w-full h-full object-cover"
        />
      </AvatarFallback>
    </Avatar>
  );
}

export function UserAvatarSkeleton({
  className,
  size = "sm",
}: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return <Skeleton className={cn(avatarClassName({ size }), className)} />;
}

export function UserAvatarWithName({
  userId,
  className,
  linkToProfile,
  size = "sm",
}: UserComponentProps & {
  linkToProfile?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { data: profile } = useSuspenseQuery(profileOptions(userId));

  const content = (
    <div className="flex flex-row gap-2 items-center">
      <UserAvatar userId={userId} size={size} />
      <Text size="sm">{profile?.displayName}</Text>
    </div>
  );

  if (linkToProfile) {
    return (
      <Link href={`/profile/${userId}`} className={cn("flex w-max", className)}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

const triggerAvatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

type UserAvatarSignedButtonProps = UserComponentProps &
  React.HTMLAttributes<HTMLDivElement> & {
    /** Use group-hover with named group (parent must have "group/avatar-trigger" class) 
      Allows to animate the button when the parent is hovered
    */
    groupHover?: boolean;
  };

export const UserAvatarSignedButton = React.forwardRef<
  HTMLDivElement,
  UserAvatarSignedButtonProps
>(({ userId, groupHover, ...props }, ref) => {
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        triggerAvatarClassName,
        "cursor-pointer transition-transform ease-out",
        groupHover ? "group-hover/avatar-trigger:scale-110" : "hover:scale-110",
        props.className,
      )}
    >
      <UserAvatar
        userId={userId}
        className={triggerAvatarClassName}
        size="md"
      />
    </div>
  );
});
UserAvatarSignedButton.displayName = "UserAvatarSignedButton";

export function UserAvatarSignedButtonSkeleton() {
  return (
    <div className={triggerAvatarClassName}>
      <UserAvatarSkeleton className={triggerAvatarClassName} />
    </div>
  );
}

export function UserAvatarWithNameSkeleton(props: {
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div className={props.className}>
      <div className="flex flex-row gap-2 items-center">
        <UserAvatarWithNameLoader size={props.size} />{" "}
      </div>
    </div>
  );
}

function UserAvatarWithNameLoader({
  size = "sm",
}: {
  size?: UserComponentProps["size"];
}) {
  return (
    <>
      <UserAvatarSkeleton size={size} />
      <Skeleton className={loaderTextClassName({ size })} />
    </>
  );
}
