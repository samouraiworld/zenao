"use client";

import { UrlObject } from "url";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  BookOpenText,
  BoxesIcon,
  CompassIcon,
  LucideProps,
  Rss,
  Tickets,
} from "lucide-react";
import {
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
} from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import QuickCreateMenu from "./quick-create-menu";
import { ToggleThemeButton } from "@/components/widgets/buttons/toggle-theme-button";
import { Button } from "@/components/shadcn/button";
import { userInfoOptions } from "@/lib/queries/user";
import { cn } from "@/lib/tailwind";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import useSmartBack from "@/hooks/use-smart-back";
import Text from "@/components/widgets/texts/text";
import { Web3Image } from "@/components/widgets/images/web3-image";
import {
  UserAvatar,
  UserAvatarSkeleton,
} from "@/components/features/user/user";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import SoonOnBase from "@/components/widgets/soon-on-base";
import VersionTag from "@/components/widgets/version-tag";

export type NavItem = {
  key: string;
  to: string | UrlObject;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  needsAuth: boolean;
  children: React.ReactNode;
};

// XXX: there is an hydration error on header links and the top-right avatar
// but only when you hard-refresh the discover page, must investigate.
// Since it does not seem to affect functionality, we can ignore it for now
const HeaderLinks = () => {
  const t = useTranslations("navigation");
  const pathname = usePathname();
  const navItems: NavItem[] = useMemo(
    () => [
      {
        key: "discover",
        to: "/discover",
        icon: CompassIcon,
        needsAuth: false,
        children: t("discover"),
      },
      {
        key: "communities",
        to: "/communities",
        icon: BoxesIcon,
        needsAuth: false,
        children: t("communities"),
      },
      {
        key: "tickets",
        to: "/tickets",
        icon: Tickets,
        needsAuth: true,
        children: t("your-tickets"),
      },
      {
        key: "manifesto",
        to: "/manifesto",
        icon: BookOpenText,
        needsAuth: false,
        children: t("manifesto"),
      },
    ],
    [t],
  );

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      {navItems.map((item) => {
        // Instead of conditionally returning null, we'll use a SignedIn component
        // to ensure consistent cxlient/server rendering
        if (item.needsAuth) {
          return (
            isMounted && (
              <SignedIn key={item.key}>
                <NavLink item={item} pathname={pathname} />
              </SignedIn>
            )
          );
        }

        return <NavLink key={item.key} item={item} pathname={pathname} />;
      })}
    </>
  );
};

// Extract the NavLink rendering to a separate component
const NavLink = ({ item, pathname }: { item: NavItem; pathname: string }) => {
  const isActive = pathname === item.to;

  return (
    <Link href={item.to}>
      <div
        className={cn(
          "flex gap-1 items-center",
          isActive ? "text-primary-color" : "text-secondary-color",
          "hover:text-primary-color",
        )}
      >
        <item.icon className="w-5 h-5 text-inherit" />
        <Text
          size="sm"
          variant={isActive ? "primary" : "secondary"}
          className="text-inherit max-[999px]:hidden"
        >
          {item.children}
        </Text>
      </div>
    </Link>
  );
};

const GoBackButton = ({ className }: { className?: string }) => {
  const { handleBack, canGoBack } = useSmartBack();

  if (!canGoBack) {
    return null; // Don't render the button if there's no history to go back to
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("flex items-center justify-center", className)}
      onClick={handleBack}
    >
      <ArrowLeft className="w-5 h-5 text-secondary-color hover:text-primary-color" />
    </Button>
  );
};

export function Header() {
  const t = useTranslations("navigation");

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="flex justify-between p-4 w-full items-center">
      {/* Desktop */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2">
          <GoBackButton className="hidden standalone:flex" />
          <Link href="/" className="flex gap-2 items-center">
            <Web3Image
              src="/zenao-logo.png"
              alt="zenao logo"
              width={28}
              height={28}
              className="max-[450px]:w-6 max-[450px]:h-6"
              priority
            />
            <Text className="max-md:hidden font-extrabold">{t("zenao")}</Text>
          </Link>
          <VersionTag className="hidden sm:flex" />
        </div>
        <div className="flex standalone:hidden standalone:md:flex flex-row gap-4">
          <HeaderLinks />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <SoonOnBase className="hidden sm:flex" />
        <QuickCreateMenu />
        <div className="max-md:hidden">
          <ToggleThemeButton />
        </div>
        <Auth className="h-fit" isMounted={isMounted} />
      </div>
    </header>
  );
}

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

const Auth = ({
  className,
  isMounted,
}: {
  className?: string;
  isMounted: boolean;
}) => {
  const t = useTranslations("navigation");
  const { trackEvent } = useAnalyticsEvents();
  const { signOut, getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  return (
    <div className={className}>
      {/* Signed out state */}
      <SignedOut>
        <SignInButton>
          <Button
            variant="outline"
            onClick={() => {
              trackEvent("SignInClick", {
                props: { context: "navigation-header" },
              });
            }}
          >
            <Text size="sm">{t("sign-in")}</Text>
          </Button>
        </SignInButton>
      </SignedOut>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Loading state */}
          {isMounted && (
            <div>
              <ClerkLoading>
                <div className={avatarClassName}>
                  <UserAvatarSkeleton className={avatarClassName} />
                </div>
              </ClerkLoading>
              {/* Signed in state */}
              <SignedIn>
                <div
                  className={cn(
                    avatarClassName,
                    "cursor-pointer hover:scale-110 transition-transform ease-out",
                  )}
                >
                  <UserAvatar
                    realmId={userInfo?.realmId || ""}
                    className={avatarClassName}
                    size="md"
                  />
                </div>
              </SignedIn>
            </div>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px] mt-2 mr-4">
          <Link href={`/profile/${userInfo?.realmId}`}>
            <DropdownMenuItem className="cursor-pointer">
              {t("view-profile")}
            </DropdownMenuItem>
          </Link>
          <Link href="/settings">
            <DropdownMenuItem className="cursor-pointer">
              {t("edit-profile")}
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              signOut();
            }}
          >
            {t("sign-out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
