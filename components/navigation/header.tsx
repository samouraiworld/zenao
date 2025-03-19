"use client";

import { UrlObject } from "url";
import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  BookOpenText,
  CalendarDays,
  CompassIcon,
  LucideProps,
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
import { useRouter } from "next/navigation";
import Text from "../texts/text";
import { ToggleThemeButton } from "@/components/buttons/ToggleThemeButton";
import { Button } from "@/components/shadcn/button";
import { userAddressOptions } from "@/lib/queries/user";
import { UserAvatarSkeleton, UserAvatar } from "@/components/common/user";
import { cn } from "@/lib/tailwind";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

type NavItem = {
  key: string;
  to: string | UrlObject;
  icon: React.ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
  >;
  needsAuth: boolean;
  children: React.ReactNode;
};

const HeaderLinks: React.FC<{ isLogged: boolean }> = ({ isLogged }) => {
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
        key: "your-events",
        to: "/created",
        icon: CalendarDays,
        needsAuth: true,
        children: t("your-events"),
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

  return (
    <>
      {navItems.map((item) => {
        if (item.needsAuth && !isLogged) {
          return null;
        }

        const isActive = pathname === item.to;

        return (
          <Link key={item.key} href={item.to}>
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
                className="text-inherit max-[550px]:hidden"
              >
                {item.children}
              </Text>
            </div>
          </Link>
        );
      })}
    </>
  );
};

// XXX: there is an hydration error on header links and the top-right avatar
// but only when you hard-refresh the discover page, must investigate.
// Since it does not seem to affect functionality, we can ignore it for now

export function Header() {
  const { getToken, userId } = useAuth();
  const t = useTranslations("navigation");
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  return (
    <div className="flex justify-between p-4 w-full items-center">
      {/* Desktop */}
      <div className="flex max-[450px]:gap-4 gap-6 items-center">
        <Link href="/" className="flex gap-2 items-center">
          <Image
            src="/zenao-logo.png"
            alt="zenao logo"
            width={28}
            height={28}
            className="max-[450px]:w-6 max-[450px]:h-6"
            priority
          />
          <Text className="max-md:hidden font-extrabold">{t("zenao")}</Text>
        </Link>

        <div className="flex flex-row gap-4">
          <HeaderLinks isLogged={!!userId} />
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="max-md:hidden">
          <ToggleThemeButton />
        </div>

        <Auth userAddress={address} className="h-fit" />
      </div>
    </div>
  );
}

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

const Auth: React.FC<{ userAddress: string | null; className?: string }> = ({
  className,
  userAddress,
}) => {
  const t = useTranslations("navigation");
  const { signOut } = useAuth();
  const router = useRouter();

  return (
    <div className={className}>
      {/* Signed out state */}
      <SignedOut>
        <SignInButton>
          <Button variant="outline">
            <Text size="sm">{t("sign-in")}</Text>
          </Button>
        </SignInButton>
      </SignedOut>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Loading state */}
          <div>
            <ClerkLoading>
              <div className={avatarClassName}>
                <UserAvatarSkeleton className={avatarClassName} />
              </div>
            </ClerkLoading>
            {/* Signed in state */}
            <SignedIn>
              <div className={avatarClassName}>
                <UserAvatar address={userAddress} className={avatarClassName} />
              </div>
            </SignedIn>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px] mt-2 mr-4">
          <DropdownMenuItem onClick={() => router.push("/settings")}>
            {t("settings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
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
