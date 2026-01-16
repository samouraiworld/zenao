"use client";

import { EllipsisVertical } from "lucide-react";

import { useTranslations } from "next-intl";
import { UserAvatarSignedButton } from "../user/user";
import { UserMenu } from "../user/user-menu";
import { UserProfile } from "@/lib/queries/profile";
import { useAccountSwitcher } from "@/hooks/use-account-switcher";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar";

type NavUserProps = {
  readonly userId: string;
  readonly user: UserProfile;
};

export function NavUser({ userId, user }: NavUserProps) {
  const t = useTranslations("dashboard.navUser");
  const { teams, activeAccount } = useAccountSwitcher(userId);

  const activeTeam =
    activeAccount?.type === "team"
      ? teams.find((team) => team.teamId === activeAccount.id)
      : null;

  const currentDisplayName = activeTeam?.displayName ?? user.displayName;
  const currentAccountId = activeAccount?.id ?? userId;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <UserMenu variant="dashboard">
          <SidebarMenuButton
            size="lg"
            className="group/avatar-trigger data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-full"
          >
            <UserAvatarSignedButton userId={currentAccountId} groupHover />

            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{currentDisplayName}</span>
              {activeTeam && (
                <span className="truncate text-xs text-muted-foreground">
                  {t("team")}
                </span>
              )}
            </div>
            <EllipsisVertical className="ml-auto size-4" />
          </SidebarMenuButton>
        </UserMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
