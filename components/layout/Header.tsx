"use client";

import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "../shadcn/button";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import { useIsMobile } from "@/app/hooks/useIsMobile";

export const Header: React.FC = () => {
  const isMobile = useIsMobile();
  const t = useTranslations("header");

  return (
    <div className="flex justify-center sm:p-2">
      <div className="flex flex-row items-center p-2 gap-1 sm:gap-2 rounded-xl bg-secondary">
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
            <span className="font-extrabold">{t("zenao")}</span>
          </Link>
        )}

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
    </div>
  );
};
