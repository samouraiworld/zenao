import { cookies } from "next/headers";
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

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
          "max-[1808px]:peer-data-[variant=inset]:!mr-2 min-[1616px]:peer-data-[variant=inset]:peer-data-[state=collapsed]:!mr-auto",
        )}
      >
        <DashboardHeader navbarStyle={navbarStyle} />
        <div className="h-full p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
