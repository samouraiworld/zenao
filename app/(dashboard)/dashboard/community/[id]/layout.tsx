import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import DashboardCommunityContextProvider from "./dashboard-community-context-provider";
import { getQueryClient } from "@/lib/get-query-client";
import { withCommunityRolesRestriction } from "@/lib/permissions/with-roles-required";
import { communityInfo, communityUserRoles } from "@/lib/queries/community";
import { userInfoOptions } from "@/lib/queries/user";
import { ScreenContainerCentered } from "@/components/layout/screen-container";

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
  const { getToken, userId } = await auth();
  const token = await getToken();

  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;

  const t = await getTranslations();

  if (!token || !userProfileId) {
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
    communityUserRoles(communityId, userProfileId),
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardCommunityContextProvider
        communityData={communityData}
        roles={roles}
      >
        {children}
      </DashboardCommunityContextProvider>
    </HydrationBoundary>
  );
}

export default withCommunityRolesRestriction(DashboardCommunityManagementPage, [
  "administrator",
]);
