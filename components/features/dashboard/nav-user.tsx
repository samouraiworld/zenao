"use client";

import {
  EllipsisVertical,
  LogOut,
  CircleUserRound,
  ArrowLeftRight,
} from "lucide-react";

import { ClerkLoading } from "@clerk/nextjs";
import { SignedIn, SignOutButton } from "@clerk/clerk-react";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserAvatar, UserAvatarSkeleton } from "../user/user";
import { UserProfile } from "@/lib/queries/profile";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/shadcn/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

type NavUserProps = {
  readonly userId: string;
  readonly user: UserProfile;
};

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

export function NavUser({ userId, user }: NavUserProps) {
  const { isMobile } = useSidebar();
  const t = useTranslations("dashboard.navUser");

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-full"
            >
              <div>
                <ClerkLoading>
                  <div className={avatarClassName}>
                    <UserAvatarSkeleton className={avatarClassName} />
                  </div>
                </ClerkLoading>
                {/* Signed in state */}
                <SignedIn>
                  <div className={avatarClassName}>
                    <UserAvatar
                      userId={userId}
                      className={avatarClassName}
                      size="md"
                    />
                  </div>
                </SignedIn>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.displayName}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {userId}
                </span>
              </div>
              <EllipsisVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <ClerkLoading>
                  <div className={avatarClassName}>
                    <UserAvatarSkeleton className={avatarClassName} />
                  </div>
                </ClerkLoading>
                {/* Signed in state */}
                <SignedIn>
                  <div className={avatarClassName}>
                    <UserAvatar
                      userId={userId}
                      className={avatarClassName}
                      size="md"
                    />
                  </div>
                </SignedIn>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">
                    {user.displayName}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {userId}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={`/profile/${userId}`}>
                  <CircleUserRound />
                  {t("profile")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/">
                  <ArrowLeftRight />
                  {t("switch-to-regular-user-mode")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <SignOutButton>
                <div>
                  <LogOut />
                  {t("sign-out")}
                </div>
              </SignOutButton>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
