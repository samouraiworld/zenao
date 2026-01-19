"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { NavMain } from "./nav-main";
import AppSidebarFooter from "./app-sidebar-footer";
import { userInfoOptions } from "@/lib/queries/user";
import { planSchema } from "@/types/schemas";

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/shadcn/sidebar";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { Skeleton } from "@/components/shadcn/skeleton";
import Text from "@/components/widgets/texts/text";
import { useSidebarItems } from "@/lib/navigation/dashboard/sidebar/sidebar-items";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const t = useTranslations("navigation");

  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );

  const result = planSchema.safeParse(userInfo?.plan || "free");
  const plan = result.success ? result.data : "free";

  const sidebarItems = useSidebarItems();

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
        <NavMain items={sidebarItems} userPlan={plan} />
      </SidebarContent>
      <Suspense fallback={<Skeleton className="h-12 w-full" />}>
        <AppSidebarFooter />
      </Suspense>
    </Sidebar>
  );
}
