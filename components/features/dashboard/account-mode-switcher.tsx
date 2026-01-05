import { ArrowLeftRight, CircleUserRound, LogOut } from "lucide-react";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserAvatar } from "../user/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { profileOptions, UserProfile } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

export function AccountModeSwitcher() {
  const { getToken, userId: authId } = useAuth();
  const { data: user } = useSuspenseQuery(userInfoOptions(getToken, authId));
  const { data: profile } = useSuspenseQuery(
    profileOptions(user?.userId || ""),
  );

  if (!user || !profile) {
    return null;
  }

  return <AccountModeSwitcherView user={profile} userId={user.userId} />;
}

export function AccountModeSwitcherView({
  user,
  userId,
}: {
  readonly user: UserProfile;
  readonly userId: string;
}) {
  const t = useTranslations("dashboard.navUser");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={avatarClassName}>
          <UserAvatar userId={userId} className={avatarClassName} size="md" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="min-w-56 space-y-1 rounded-lg"
        side="bottom"
        align="end"
        sideOffset={4}
      >
        <div className="flex w-full items-center justify-between gap-2 px-1 py-1.5">
          <div className={avatarClassName}>
            <UserAvatar userId={userId} className={avatarClassName} size="md" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user.displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {userId}
            </span>
          </div>
        </div>
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
  );
}
