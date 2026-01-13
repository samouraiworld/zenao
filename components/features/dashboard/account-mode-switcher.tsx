"use client";

import { Check, CircleUserRound, LogOut, Plus } from "lucide-react";

import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserAvatar } from "../user/user";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { useAccountSwitcher } from "@/hooks/use-account-switcher";
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

  return (
    <AccountModeSwitcherView
      user={profile}
      userId={user.userId}
      plan={user.plan}
    />
  );
}

export function AccountModeSwitcherView({
  user,
  userId,
  plan,
}: {
  readonly user: UserProfile;
  readonly userId: string;
  readonly plan: string;
}) {
  const t = useTranslations("dashboard.navUser");
  const {
    teams,
    activeAccount,
    isPersonalActive,
    isCreateTeamOpen,
    setIsCreateTeamOpen,
    handleSwitchToPersonal,
    handleSwitchToTeam,
  } = useAccountSwitcher(userId);

  const currentAccountId = activeAccount?.id ?? userId;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className={avatarClassName}>
            <UserAvatar
              userId={currentAccountId}
              className={avatarClassName}
              size="md"
            />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 space-y-1 rounded-lg"
          side="bottom"
          align="end"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {t("accounts")}
          </DropdownMenuLabel>

          <DropdownMenuItem
            onClick={handleSwitchToPersonal}
            className="flex items-center gap-2"
          >
            <div className={avatarClassName}>
              <UserAvatar
                userId={userId}
                className={avatarClassName}
                size="md"
              />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{user.displayName}</span>
                {plan === "pro" && (
                  <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded">
                    Pro
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("personal-account")}
              </div>
            </div>
            {isPersonalActive && <Check className="size-4" />}
          </DropdownMenuItem>

          {teams.map((team) => (
            <DropdownMenuItem
              key={team.teamId}
              onClick={() => handleSwitchToTeam(team.teamId)}
              className="flex items-center gap-2"
            >
              <div className={avatarClassName}>
                <UserAvatar
                  userId={team.teamId}
                  className={avatarClassName}
                  size="md"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{team.displayName}</span>
                  {team.plan === "pro" && (
                    <span className="bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded">
                      Pro
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{t("team")}</div>
              </div>
              {activeAccount?.type === "team" &&
                activeAccount.id === team.teamId && (
                  <Check className="size-4" />
                )}
            </DropdownMenuItem>
          ))}

          <DropdownMenuItem
            onClick={() => setIsCreateTeamOpen(true)}
            className="flex items-center gap-2"
          >
            <div className="flex size-7 items-center justify-center rounded-full border border-dashed sm:size-8">
              <Plus className="size-4" />
            </div>
            <span>{t("create-team")}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Link href={`/profile/${currentAccountId}`}>
                <CircleUserRound />
                {t("profile")}
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

      <CreateTeamDialog
        open={isCreateTeamOpen}
        onOpenChange={setIsCreateTeamOpen}
        userId={userId}
      />
    </>
  );
}
