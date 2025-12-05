"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AccountModeSwitcher } from "./account-mode-switcher";
import { Separator } from "@/components/shadcn/separator";
import { SidebarTrigger } from "@/components/shadcn/sidebar";
import { ToggleThemeButton } from "@/components/widgets/buttons/toggle-theme-button";
import { cn } from "@/lib/tailwind";
import { profileOptions } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";
import { NavbarStyle } from "@/lib/preferences/preferences";

type DashboardHeaderProps = {
  readonly navbarStyle: NavbarStyle;
};

export default function DashboardHeader({ navbarStyle }: DashboardHeaderProps) {
  const { getToken, userId } = useAuth();
  const { data: user } = useSuspenseQuery(userInfoOptions(getToken, userId));
  const { data: profile } = useSuspenseQuery(
    profileOptions(user?.realmId || ""),
  );

  if (!user || !profile) {
    return null;
  }

  return (
    <header
      data-navbar-style={navbarStyle}
      className={cn(
        "flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12",
        // Handle sticky navbar style with conditional classes so blur, background, z-index, and rounded corners remain consistent across all SidebarVariant layouts.
        "data-[navbar-style=sticky]:bg-background/50 data-[navbar-style=sticky]:sticky data-[navbar-style=sticky]:top-0 data-[navbar-style=sticky]:z-50 data-[navbar-style=sticky]:overflow-hidden data-[navbar-style=sticky]:rounded-t-[inherit] data-[navbar-style=sticky]:backdrop-blur-md",
      )}
    >
      <div className="flex w-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
        </div>
        <div className="flex items-center gap-2">
          <ToggleThemeButton />
          <AccountModeSwitcher user={profile} realmId={user.realmId} />
        </div>
      </div>
    </header>
  );
}
