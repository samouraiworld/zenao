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

export const Avatar: React.FC<AvatarProps> = ({ uri, className }) => {
  return (
    <ShadcnAvatar className={cn("h-7 w-7 sm:h-8 sm:w-8", className)}>
      <Image
        alt="avatar"
        src={uri}
        loader={web3ImgLoader}
        fill
        // className="self-center"
      />
    </ShadcnAvatar>
  );
};

interface AvatarLoaderProps {
  className?: string;
}

export const AvatarLoader: React.FC<AvatarLoaderProps> = ({ className }) => {
  return (
    <ShadcnAvatar className={cn("h-7 w-7 sm:h-[30px] sm:w-[30px]", className)}>
      <Skeleton className={cn("h-7 w-7 sm:h-[30px] sm:w-[30px]", className)} />
    </ShadcnAvatar>
  );
};
