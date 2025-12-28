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
  const { getToken, userId } = useAuth();
  const { data: user } = useSuspenseQuery(userInfoOptions(getToken, userId));
  const { data: profile } = useSuspenseQuery(
    profileOptions(user?.realmId || ""),
  );

  if (!user || !profile) {
    return null;
  }

  return <AccountModeSwitcherView user={profile} realmId={user.realmId} />;
}

export function AccountModeSwitcherView({
  user,
  realmId,
}: {
  readonly user: UserProfile;
  readonly realmId: string;
}) {
  const t = useTranslations("dashboard.navUser");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={avatarClassName}>
          <UserAvatar realmId={realmId} className={avatarClassName} size="md" />
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
            <UserAvatar
              realmId={realmId}
              className={avatarClassName}
              size="md"
            />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">{user.displayName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {realmId}
            </span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={`/profile/${realmId}`}>
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
