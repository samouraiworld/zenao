import {
  dehydrate,
  HydrationBoundary,
  useQueryClient,
} from "@tanstack/react-query";
import DashboardTeamSettingsTabs from "./dashboard-team-settings-tabs";
import DashboardTeamSettingsHeader from "./dashboard-team-settings-header";
import { TeamProvider } from "./team-provider";
import DashboardTeamSettingsEditionProvider from "./dashboard-team-settings-edition-provider";

export default function TeamSettingsPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TeamProvider>
        <DashboardTeamSettingsEditionProvider>
          <DashboardTeamSettingsHeader />
          <DashboardTeamSettingsTabs>{children}</DashboardTeamSettingsTabs>
        </DashboardTeamSettingsEditionProvider>
      </TeamProvider>
    </HydrationBoundary>
  );
}
