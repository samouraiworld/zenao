"use client";

import { Suspense } from "react";
import { NavMain } from "./nav-main";

import AppSidebarFooter from "./app-sidebar-footer";
import {
  Sidebar,
  SidebarContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar";
import { APP_CONFIG } from "@/lib/config/app-config";
import { sidebarItems } from "@/lib/navigation/dashboard/sidebar/sidebar-items";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { Skeleton } from "@/components/shadcn/skeleton";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
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
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <AppSidebarFooter />
      </Suspense>
    </Sidebar>
  );
}
