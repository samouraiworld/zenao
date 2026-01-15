import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import DashboardTeamSettingsTabs from "./dashboard-team-settings-tabs";
import DashboardTeamSettingsHeader from "./dashboard-team-settings-header";
import { TeamProvider } from "./team-provider";
import DashboardTeamSettingsEditionProvider from "./dashboard-team-settings-edition-provider";
import { getQueryClient } from "@/lib/get-query-client";

export default function TeamSettingsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense
        fallback={<Loader2 className="animate-spin h-6 w-6 mx-auto mt-20" />}
      >
        <TeamProvider>
          <DashboardTeamSettingsEditionProvider>
            <DashboardTeamSettingsHeader />
            <DashboardTeamSettingsTabs>{children}</DashboardTeamSettingsTabs>
          </DashboardTeamSettingsEditionProvider>
        </TeamProvider>
      </Suspense>
    </HydrationBoundary>
  );
}
