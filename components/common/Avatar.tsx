"use client";

import Image from "next/image";
import { Skeleton } from "../shadcn/skeleton";
import { Avatar as ShadcnAvatar } from "@/components/shadcn/avatar";
import { web3ImgLoader } from "@/lib/web3-img-loader";
import { cn } from "@/lib/tailwind";

interface AvatarProps {
  uri: string;
  className?: string;
}

interface AvatarLoaderProps {
  className?: string;
}

export function HeaderAvatar({ uri, className }: AvatarProps) {
  return (
    <ShadcnAvatar className={cn("h-7 w-7 sm:h-8 sm:w-8", className)}>
      <Image alt="avatar" src={uri} loader={web3ImgLoader} fill />
    </ShadcnAvatar>
  );
}

export function HeaderAvatarLoader({ className }: AvatarLoaderProps) {
  return (
    <ShadcnAvatar className={cn("h-7 w-7 sm:h-[30px] sm:w-[30px]", className)}>
      <Skeleton className={cn("h-7 w-7 sm:h-[30px] sm:w-[30px]", className)} />
    </ShadcnAvatar>
  );
}

export function Avatar({ uri, className }: AvatarProps) {
  return (
    <ShadcnAvatar className={cn("h-6 w-6", className)}>
      <Image alt="avatar" src={uri} loader={web3ImgLoader} fill />
    </ShadcnAvatar>
  );
}

export function AvatarLoader({ className }: AvatarLoaderProps) {
  return (
    <ShadcnAvatar className={cn("h-6 w-6", className)}>
      <Skeleton className="h-6 w-6" />
    </ShadcnAvatar>
  );
}
