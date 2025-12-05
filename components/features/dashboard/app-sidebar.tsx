"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar";
import { APP_CONFIG } from "@/lib/config/app-config";
import { sidebarItems } from "@/lib/navigation/dashboard/sidebar/sidebar-items";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { userInfoOptions } from "@/lib/queries/user";
import { profileOptions } from "@/lib/queries/profile";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { getToken, userId } = useAuth();
  const { data: user } = useSuspenseQuery(userInfoOptions(getToken, userId));
  const { data: profile } = useSuspenseQuery(
    profileOptions(user?.realmId || ""),
  );

  if (!user || !profile) {
    return null;
  }

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarGroupLabel className="gap-2 p-0">
              <Web3Image
                src="/zenao-logo.png"
                alt="zenao logo"
                width={28}
                height={28}
                className="!w-6 !h-6"
                priority
              />
              <span className="text-base font-semibold">{APP_CONFIG.name}</span>
            </SidebarGroupLabel>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={sidebarItems} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={profile} realmId={user?.realmId ?? ""} />
      </SidebarFooter>
    </Sidebar>
  );
}
