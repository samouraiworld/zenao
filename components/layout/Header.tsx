"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../shadcn/button";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

export const Header: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex justify-center sm:p-2">
      <div className="flex flex-row items-center p-2 gap-1 sm:gap-2 rounded-xl dark:bg-[#1B1B1B] bg-[#f2f2f2]">
        {!isMobile && (
          <Link href="/" className="flex flex-row gap-2">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={26}
              height={26}
              priority
              className="sm:overflow-auto"
            />
            <span className="font-extrabold">ZENAO</span>
          </Link>
        )}

        <div className="flex flex-row gap-3 sm:gap-5 mr-3 sm:mx-4">
          <a className="text-sm dark:text-[#808080]">Discover</a>
          <a className="text-sm dark:text-[#808080]">Calendar</a>
          <a className="text-sm dark:text-[#808080]">Pricing</a>
          <a className="text-sm dark:text-[#808080]">Blog</a>
        </div>
        <SignedOut>
          <SignInButton>
            <Button variant="secondary">
              <span>Sign in</span>
            </Button>
          </SignInButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <ToggleThemeButton />
      </div>
    </div>
  );
};
