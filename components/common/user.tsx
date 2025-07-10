"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@radix-ui/react-avatar";
import { Skeleton } from "../shadcn/skeleton";
import Text from "../widgets/texts/text";
import { Web3Image } from "../widgets/images/web3-image";
import { profileOptions } from "@/lib/queries/profile";
import { cn } from "@/lib/tailwind";

interface UserComponentProps {
  address: string | null | undefined;
  className?: string;
}

/*
XXX: these classnames (rounded-full, overflow-hidden) are already set in the shadcn avatar components
but the class merging does not seem to work so we need to reset them here
*/

const avatarClassName = "w-6 h-6 rounded-full overflow-hidden inline-block";

export function UserAvatar({ address, className }: UserComponentProps) {
  const { data: profile } = useSuspenseQuery(profileOptions(address));
  return (
    <Avatar className={cn(avatarClassName, className)}>
      <AvatarFallback>
        <Web3Image
          src={
            (profile?.avatarUri && profile.avatarUri !== ""
              ? profile.avatarUri
              : undefined) ?? "/zenao-profile.png"
          }
          width={45}
          height={45}
          quality={60}
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
  address,
  className,
  linkToProfile,
}: UserComponentProps & { linkToProfile?: boolean }) {
  const { data: profile } = useSuspenseQuery(profileOptions(address));

  const content = (
    <div className="flex flex-row gap-2 items-center">
      <UserAvatar address={profile?.address} />
      <Text size="sm">{profile?.displayName}</Text>
    </div>
  );

  if (linkToProfile) {
    return (
      <Link
        href={`/profile/${profile?.address}`}
        className={cn("flex w-max", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
