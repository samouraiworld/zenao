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
  Tickets,
} from "lucide-react";
import {
  ClerkLoading,
  SignedIn,
  SignedOut,
  SignInButton,
  useAuth,
} from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ToggleThemeButton } from "@/components/widgets/buttons/toggle-theme-button";
import { Button } from "@/components/shadcn/button";
import { userAddressOptions } from "@/lib/queries/user";
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
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import {
  UserAvatar,
  UserAvatarSkeleton,
} from "@/components/features/user/user";

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
          className="text-inherit max-[624px]:hidden"
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
  const { getToken, userId } = useAuth();
  const t = useTranslations("navigation");
  const { data: address } = useQuery(userAddressOptions(getToken, userId));
  const scrollDirection = useScrollDirection();

  return (
    <div
      className={`sticky ${scrollDirection === "down" ? "-top-24" : "top-0"} bg-background z-50 transition-all duration-500`}
    >
      <div className="flex justify-between p-4 w-full items-center">
        {/* Desktop */}
        <div className="flex max-[450px]:gap-4 gap-6 items-center">
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
          </div>
          <div className="flex standalone:hidden standalone:md:flex flex-row gap-4">
            <HeaderLinks />
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <Link passHref href="/create">
            <ButtonWithChildren
              variant="outline"
              size="sm"
              className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17]"
            >
              {t("create-event")}
            </ButtonWithChildren>
          </Link>
          <div className="max-md:hidden">
            <ToggleThemeButton />
          </div>
          <Auth userAddress={address} className="h-fit" />
        </div>
      </div>
    </div>
  );
}

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

const Auth = ({
  className,
  userAddress,
}: {
  userAddress?: string | null;
  className?: string;
}) => {
  const t = useTranslations("navigation");
  const { signOut } = useAuth();

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
                <UserAvatarSkeleton className={avatarClassName} size="sm" />
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
                  address={userAddress}
                  className={avatarClassName}
                  size="sm"
                />
              </div>
            </SignedIn>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[200px] mt-2 mr-4">
          <Link href={`/profile/${userAddress}`}>
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

function useScrollDirection() {
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | null>(
    null,
  );

  useEffect(() => {
    let lastScrollY = window.pageYOffset;

    const min = 5;

    const updateScrollDirection = () => {
      const scrollY = window.pageYOffset;
      const direction = scrollY > lastScrollY ? "down" : "up";
      if (
        direction !== scrollDirection &&
        (scrollY - lastScrollY > min || scrollY - lastScrollY < -min)
      ) {
        setScrollDirection(direction);
      }
      lastScrollY = scrollY > 0 ? scrollY : 0;
    };
    window.addEventListener("scroll", updateScrollDirection); // add event listener
    return () => {
      window.removeEventListener("scroll", updateScrollDirection); // clean up
    };
  }, [scrollDirection]);

  return scrollDirection;
}
