"use client";

import {
  EllipsisVertical,
  LogOut,
  CircleUserRound,
  Check,
  Plus,
} from "lucide-react";

import { ClerkLoading } from "@clerk/nextjs";
import { SignedIn, SignOutButton } from "@clerk/clerk-react";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { UserAvatar, UserAvatarSkeleton } from "../user/user";
import { UserProfile } from "@/lib/queries/profile";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import { useAccountSwitcher } from "@/hooks/use-account-switcher";
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
  readonly plan: string;
};

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

export function NavUser({ userId, user, plan }: NavUserProps) {
  const { isMobile } = useSidebar();
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

  const activeTeam =
    activeAccount?.type === "team"
      ? teams.find((t) => t.teamId === activeAccount.id)
      : null;

  const currentDisplayName = activeTeam?.displayName ?? user.displayName;
  const currentAccountId = activeAccount?.id ?? userId;

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
                <SignedIn>
                  <div className={avatarClassName}>
                    <UserAvatar
                      userId={currentAccountId}
                      className={avatarClassName}
                      size="md"
                    />
                  </div>
                </SignedIn>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {currentDisplayName}
                </span>
                {activeTeam && (
                  <span className="truncate text-xs text-muted-foreground">
                    {t("team")}
                  </span>
                )}
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
                  <div className="text-xs text-muted-foreground">
                    {t("team")}
                  </div>
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
      </SidebarMenuItem>

      <CreateTeamDialog
        open={isCreateTeamOpen}
        onOpenChange={setIsCreateTeamOpen}
        userId={userId}
      />
    </SidebarMenu>
  );
}
