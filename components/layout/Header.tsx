"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlignJustify as AlignJustifyIcon } from "lucide-react";
import { PopoverContent } from "@radix-ui/react-popover";
import { Button } from "../shadcn/button";
import { Popover, PopoverTrigger } from "../shadcn/popover";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

export const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const t = useTranslations("header");

  return (
    <div className="flex justify-center sm:p-2">
      {!isMobile ? (
        <div className="flex flex-row items-center p-2 gap-1 sm:gap-2 rounded-xl bg-secondary">
          <Link href="/" className="flex flex-row gap-2">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={26}
              height={26}
              priority
              className="sm:overflow-auto"
            />
            <span className="font-extrabold">{t("zenao")}</span>
          </Link>

          <div className="flex flex-row gap-3 sm:gap-5 mr-3 sm:mx-4">
            <a className="text-sm text-secondary-color">{t("discover")}</a>
            <a className="text-sm text-secondary-color">{t("calendar")}</a>
            <a className="text-sm text-secondary-color">{t("pricing")}</a>
            <a className="text-sm text-secondary-color">{t("blog")}</a>
          </div>
          <SignedOut>
            <SignInButton>
              <Button variant="outline">
                <span>{t("sign-in")}</span>
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton />
          </SignedIn>
          <ToggleThemeButton />
        </div>
      ) : (
        <div className="flex flex-row justify-between w-full p-5">
          <Link href="/">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={26}
              height={26}
              priority
              className="sm:overflow-auto"
            />
          </Link>
          <div className="flex gap-2">
            <SignedOut>
              <SignInButton>
                <Button variant="outline">
                  <span>{t("sign-in")}</span>
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
            <Popover>
              <PopoverTrigger>
                <AlignJustifyIcon width={26} height={26} />
              </PopoverTrigger>
              <PopoverContent className="flex gap-1 flex-col bg-secondary rounded-xl px-4 py-2">
                <a className="text-sm">{t("discover")}</a>
                <a className="text-sm">{t("calendar")}</a>
                <a className="text-sm">{t("pricing")}</a>
                <a className="text-sm">{t("blog")}</a>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
    </div>
  );
};
