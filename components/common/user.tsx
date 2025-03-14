"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@radix-ui/react-avatar";
import Image, { getImageProps } from "next/image";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ClerkLoading, SignedIn } from "@clerk/nextjs";
import React, { ReactNode } from "react";
import { Skeleton } from "../shadcn/skeleton";
import { SmallText } from "../texts/SmallText";
import { web3ImgLoader } from "@/lib/web3-img-loader";
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
  const { props: imageProps } = getImageProps({
    src: profile?.avatarUri || "/zenao-logo.png",
    loader: profile?.avatarUri ? web3ImgLoader : undefined,
    width: 45,
    height: 45,
    alt: "Avatar",
    className: "w-full h-full object-cover",
  });
  return (
    <Avatar className={cn(avatarClassName, className)}>
      <AvatarImage {...imageProps} />
      <AvatarFallback>
        {/* the linter does not properly detect the alt prop coming from imageProps */}
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image {...imageProps} />
      </AvatarFallback>
    </Avatar>
  );
}

export function UserAvatarSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn(avatarClassName, className)} />;
}

export function UserLinkedAvatarWithLoaderAndFallback({
  userAddress,
  className,
}: {
  userAddress: string | null;
  className?: string;
}) {
  const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";
  return (
    <div className={className}>
      <ClerkLoading>
        {/* Loading state */}
        <SettingsLink>
          <UserAvatarSkeleton className={avatarClassName} />
        </SettingsLink>
      </ClerkLoading>
      {/* Signed in state */}
      <SignedIn>
        <SettingsLink>
          <UserAvatar address={userAddress} className={avatarClassName} />
        </SettingsLink>
      </SignedIn>
    </div>
  );
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
      <SmallText>{profile?.displayName}</SmallText>
    </div>
  );

  if (linkToProfile) {
    return (
      <Link
        href={`/profile/${profile?.address}`}
        className={cn("inline-flex w-max", className)}
      >
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

function SettingsLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/settings" className="flex items-center">
      {children}
    </Link>
  );
}
