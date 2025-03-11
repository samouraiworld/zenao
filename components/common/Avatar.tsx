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

export const HeaderAvatar: React.FC<AvatarProps> = ({ uri, className }) => {
  return (
    <ShadcnAvatar className={cn("h-7 w-7 sm:h-8 sm:w-8", className)}>
      <Image alt="avatar" src={uri} loader={web3ImgLoader} fill />
    </ShadcnAvatar>
  );
};

export const HeaderAvatarLoader: React.FC<AvatarLoaderProps> = ({
  className,
}) => {
  return (
    <ShadcnAvatar className={cn("h-7 w-7 sm:h-[30px] sm:w-[30px]", className)}>
      <Skeleton className={cn("h-7 w-7 sm:h-[30px] sm:w-[30px]", className)} />
    </ShadcnAvatar>
  );
};

export const Avatar: React.FC<AvatarProps> = ({ uri, className }) => {
  return (
    <ShadcnAvatar className={cn("h-5 w-5", className)}>
      <Image
        alt="avatar"
        width={20}
        height={20}
        src={uri}
        loader={web3ImgLoader}
      />
    </ShadcnAvatar>
  );
};

export const AvatarLoader: React.FC<AvatarLoaderProps> = ({ className }) => {
  return (
    <ShadcnAvatar className={cn("h-5 w-5", className)}>
      <Skeleton className="h-5 w-5" />
    </ShadcnAvatar>
  );
};
