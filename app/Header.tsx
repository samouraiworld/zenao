"use client";

import React, { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { AlignJustify as AlignJustifyIcon } from "lucide-react";
import { PopoverContent } from "@radix-ui/react-popover";
import {
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
} from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Popover, PopoverTrigger } from "@/components/shadcn/popover";
import { Card } from "@/components/cards/Card";
import { SmallText } from "@/components/texts/SmallText";
import { Text } from "@/components/texts/DefaultText";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import { Button } from "@/components/shadcn/button";
import { userAddressOptions } from "@/lib/queries/user";
import { UserAvatarSkeleton, UserAvatar } from "@/components/common/user";

const HeaderLinks: React.FC<{ isLogged: boolean }> = ({ isLogged }) => {
  const t = useTranslations("header");

  return (
    <>
      <Link href="/discover">
        <SmallText variant="secondary">{t("discover")}</SmallText>
      </Link>
      {isLogged && (
        <Link href="/created">
          <SmallText variant="secondary">{t("your-events")}</SmallText>
        </Link>
      )}
      {isLogged && (
        <Link href="/tickets">
          <SmallText variant="secondary">{t("your-tickets")}</SmallText>
        </Link>
      )}
      <SmallText variant="secondary">{t("features")}</SmallText>
      <Link href="/manifesto">
        <SmallText variant="secondary">{t("manifesto")}</SmallText>
      </Link>
    </>
  );
};

// XXX: there is an hydration error on header links and the top-right avatar
// but only when you hard-refresh the discover page, must investigate.
// Since it does not seem to affect functionality, we can ignore it for now

export function Header() {
  const { getToken, userId } = useAuth();
  const t = useTranslations("header");
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  return (
    <div className="flex md:justify-center md:p-2 w-full">
      {/* Desktop */}
      <div className="max-md:hidden flex flex-row w-full items-center justify-center">
        <Card className="flex flex-row items-center px-3 py-2 gap-7 rounded-xl">
          <Link href="/" className="flex flex-row gap-2 items-center">
            <Image
              src="/zenao-logo.png"
              alt="zeano logo"
              width={28}
              height={28}
              priority
            />
            <Text className="font-extrabold">{t("zenao")}</Text>
          </Link>
          <div className="flex flex-row gap-3">
            <HeaderLinks isLogged={!!userId} />
          </div>
          <div className="flex flex-row gap-2 items-center justify-center">
            <ToggleThemeButton />
          </div>
        </Card>
        <Auth userAddress={address} className="flex absolute right-5" />
      </div>

      {/* Mobile */}
      <div className="md:hidden flex flex-row justify-between w-full p-3 px-4 py-3 bg-secondary/80 backdrop-blur-sm">
        <Link href="/" className="flex flex-row items-center">
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={28}
            height={28}
            priority
          />
        </Link>
        <div className="flex flex-row gap-2 items-center">
          <Auth userAddress={address} className="flex items-center" />
          <Popover>
            <PopoverTrigger>
              <AlignJustifyIcon className="h-7 w-7" />
            </PopoverTrigger>
            <PopoverContent className="flex gap-1 flex-col bg-secondary rounded-xl px-4 py-2">
              <HeaderLinks isLogged={!!userId} />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

const Auth: React.FC<{ userAddress: string | null; className?: string }> = ({
  className,
  userAddress,
}) => {
  const t = useTranslations("header");
  return (
    <div className={className}>
      {/* Signed out state */}
      <SignedOut>
        <SignInButton>
          <Button variant="outline">
            <SmallText>{t("sign-in")}</SmallText>
          </Button>
        </SignInButton>
      </SignedOut>
      {/* Loading state */}
      <ClerkLoading>
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
};

function SettingsLink({ children }: { children: ReactNode }) {
  return (
    <Link href="/settings" className="flex items-center">
      {children}
    </Link>
  );
}
