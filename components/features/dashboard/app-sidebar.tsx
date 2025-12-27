"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { NavMain } from "./nav-main";

import AppSidebarFooter from "./app-sidebar-footer";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar";
import { sidebarItems } from "@/lib/navigation/dashboard/sidebar/sidebar-items";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { Skeleton } from "@/components/shadcn/skeleton";
import Text from "@/components/widgets/texts/text";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("navigation");

  return (
    <Sidebar {...props}>
      <SidebarHeader className="h-[52px] px-2 flex justify-center">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="
                font-extrabold
                h-9 p-0
                hover:bg-transparent
                hover:text-inherit
                active:bg-transparent
                focus-visible:ring-0
              "
              size="lg"
            >
              <Link href="/" className="flex items-center gap-2">
                <Web3Image
                  src="/zenao-logo.png"
                  alt="zenao logo"
                  width={28}
                  height={28}
                  priority
                />
                <Text className="font-extrabold">{t("zenao")}</Text>
              </Link>
            </SidebarMenuButton>
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
