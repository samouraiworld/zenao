"use client";

import Image from "next/image";
import { Skeleton } from "../shadcn/skeleton";
import { Avatar as ShadcnAvatar } from "@/components/shadcn/avatar";
import { web3ImgLoader } from "@/lib/web3-img-loader";

interface AvatarProps {
  uri: string;
}

export function HeaderAvatar({ uri }: AvatarProps)  {
  return (
    <ShadcnAvatar className="h-7 w-7 sm:h-[30px] sm:w-[30px]">
      <Image
        alt="avatar"
        width={30}
        height={30}
        src={uri}
        loader={web3ImgLoader}
      />
    </ShadcnAvatar>
  );
}

export function HeaderAvatarLoader() {
  return (
    <ShadcnAvatar className="h-7 w-7 sm:h-[30px] sm:w-[30px]">
      <Skeleton className="h-7 w-7 sm:h-[30px] sm:w-[30px]" />
    </ShadcnAvatar>
  );
}

export function Avatar({ uri }: AvatarProps) {
  return (
    <ShadcnAvatar className="h-5 w-5">
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

export const AvatarLoader: React.FC = () => {
  return (
    <ShadcnAvatar className="h-5 w-5">
      <Skeleton className="h-5 w-5" />
    </ShadcnAvatar>
  );
};
