import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { AppSidebar } from "@/components/features/dashboard/app-sidebar";
import DashboardHeader from "@/components/features/dashboard/header";
import { SidebarInset, SidebarProvider } from "@/components/shadcn/sidebar";
import {
  CONTENT_LAYOUT_VALUES,
  ContentLayout,
  getPreference,
  NAVBAR_STYLE_VALUES,
  NavbarStyle,
  SIDEBAR_COLLAPSIBLE_VALUES,
  SIDEBAR_VARIANT_VALUES,
  SidebarCollapsible,
  SidebarVariant,
} from "@/lib/preferences/preferences";
import { cn } from "@/lib/tailwind";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  const token = await getToken();

  const t = await getTranslations("");

  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userRealmId = userInfo?.realmId;

  if (!token || !userRealmId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("eventForm.log-in")}
      </ScreenContainerCentered>
    );
  }

  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true";

  const [sidebarVariant, sidebarCollapsible, contentLayout, navbarStyle] =
    await Promise.all([
      getPreference<SidebarVariant>(
        "sidebar_variant",
        SIDEBAR_VARIANT_VALUES,
        "inset",
      ),
      getPreference<SidebarCollapsible>(
        "sidebar_collapsible",
        SIDEBAR_COLLAPSIBLE_VALUES,
        "icon",
      ),
      getPreference<ContentLayout>(
        "content_layout",
        CONTENT_LAYOUT_VALUES,
        "centered",
      ),
      getPreference<NavbarStyle>("navbar_style", NAVBAR_STYLE_VALUES, "scroll"),
    ]);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar variant={sidebarVariant} collapsible={sidebarCollapsible} />
      <SidebarInset
        data-content-layout={contentLayout}
        className={cn(
          "data-[content-layout=centered]:!ml-auto data-[content-layout=centered]:max-w-screen-2xl",
          // Adds right margin for inset sidebar in centered layout up to 113rem.
          // On wider screens with collapsed sidebar, removes margin and sets margin auto for alignment.
          "max-[113rem]:peer-data-[variant=inset]:!mr-2 min-[101rem]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
        )}
      >
        <DashboardHeader navbarStyle={navbarStyle} />
        <div className="h-full p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
