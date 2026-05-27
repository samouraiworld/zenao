"use client";

import {
  Check,
  CircleUserRound,
  Eye,
  LayoutDashboard,
  LogOut,
  Plus,
} from "lucide-react";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ReactNode } from "react";
import { UserAvatar } from "./user";
import { CreateTeamDialog } from "@/components/dialogs/create-team-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { useAccountSwitcher } from "@/hooks/use-account-switcher";
import { profileOptions } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";
import RoleBasedViewMode from "@/components/widgets/permissions/view-mode";
import { planSchema } from "@/types/schemas";

export type UserMenuVariant = "dashboard" | "customer";

type UserMenuProps = {
  readonly variant: UserMenuVariant;
  readonly children: ReactNode;
  readonly side?: "top" | "bottom" | "left" | "right";
  readonly align?: "start" | "center" | "end";
  readonly sideOffset?: number;
};

const avatarClassName = "h-7 w-7 sm:h-8 sm:w-8";

export function UserMenu({
  variant,
  children,
  side = "bottom",
  align = "end",
  sideOffset = 10,
}: UserMenuProps) {
  const t = useTranslations("dashboard.navUser");
  const tNav = useTranslations("navigation");

  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );
  const { data: profile } = useSuspenseQuery(
    profileOptions(userInfo?.userId || ""),
  );

  const userId = userInfo?.userId || "";
  const result = planSchema.safeParse(userInfo?.plan || "free");
  const plan = result.success ? result.data : "free";
  const displayName = profile?.displayName || "";

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
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          side={side}
          align={align}
          sideOffset={sideOffset}
        >
          {/* Personal account */}
          <DropdownMenuItem
            onClick={handleSwitchToPersonal}
            className="flex items-center gap-2 cursor-pointer"
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
                <span className="font-medium">{displayName}</span>
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

          {/* Teams (dashboard only & pro plan) */}
          {variant === "dashboard" && (
            <RoleBasedViewMode allowedRoles={["pro"]} roles={[plan]}>
              <>
                {teams.map((team) => (
                  <DropdownMenuItem
                    key={team.teamId}
                    onClick={() => handleSwitchToTeam(team.teamId)}
                    className="flex items-center gap-2 cursor-pointer"
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
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div className="flex size-7 items-center justify-center rounded-full border border-dashed sm:size-8">
                    <Plus className="size-4" />
                  </div>
                  <span>{t("create-team")}</span>
                </DropdownMenuItem>
              </>
            </RoleBasedViewMode>
          )}

          <DropdownMenuSeparator />

          {/* Profile */}
          <DropdownMenuGroup>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href={`/profile/${currentAccountId}`}>
                <CircleUserRound />
                {t("profile")}
              </Link>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />

          {/* View switch */}
          {variant === "dashboard" ? (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/">
                <Eye />
                {tNav("customer-view")}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/dashboard" target="_blank">
                <LayoutDashboard />
                {tNav("dashboard-view")}
              </Link>
            </DropdownMenuItem>
          )}

          {/* Sign out */}
          <DropdownMenuItem asChild className="cursor-pointer">
            <SignOutButton>
              <div>
                <LogOut />
                {t("sign-out")}
              </div>
            </SignOutButton>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {variant === "dashboard" && (
        <CreateTeamDialog
          open={isCreateTeamOpen}
          onOpenChange={setIsCreateTeamOpen}
          userId={userId}
        />
      )}
    </>
  );
}
