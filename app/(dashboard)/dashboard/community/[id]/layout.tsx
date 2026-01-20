import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import DashboardCommunityTabs from "./dashboard-community-tabs";
import { getQueryClient } from "@/lib/get-query-client";
import { withCommunityRolesRestriction } from "@/lib/permissions/with-roles-required";
import { communityInfo, communityUserRoles } from "@/lib/queries/community";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import DashboardCommunityContextProvider from "@/components/providers/dashboard-community-context-provider";
import getActor from "@/lib/utils/actor";

interface DashboardCommunityManagementPageProps {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

async function DashboardCommunityManagementPage({
  params,
  children,
}: DashboardCommunityManagementPageProps) {
  const { id: communityId } = await params;
  const queryClient = getQueryClient();

  const actor = await getActor();

  const t = await getTranslations();

  if (!actor) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        {t("eventForm.log-in")}
      </ScreenContainerCentered>
    );
  }

  let communityData;

  try {
    communityData = await queryClient.fetchQuery(communityInfo(communityId));
  } catch {
    notFound();
  }

  const roles = await queryClient.fetchQuery(
    communityUserRoles(communityId, actor.actingAs),
  );

  const renderLayout = () => (
    <div className="flex flex-col gap-8 pb-16 md:pb-0">
      <DashboardCommunityTabs>{children}</DashboardCommunityTabs>
    </div>
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardCommunityContextProvider
        communityData={communityData}
        roles={roles}
      >
        {renderLayout()}
      </DashboardCommunityContextProvider>
    </HydrationBoundary>
  );
}

export default withCommunityRolesRestriction(DashboardCommunityManagementPage, [
  "administrator",
]);
