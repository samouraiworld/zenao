import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import CommunitiesPageLayout from "./communities-page-layout";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import {
  getActiveAccountServer,
  getTeamIdFromActiveAccount,
} from "@/lib/active-account/server";

export default async function DashboardCommunityPage() {
  const queryClient = getQueryClient();
  const { getToken, userId: authId } = await auth();
  const token = await getToken();

  const t = await getTranslations();

  const activeAccount = await getActiveAccountServer();
  const teamId = getTeamIdFromActiveAccount(activeAccount);

  const userAddrOpts = userInfoOptions(getToken, authId, teamId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;

  if (!token || !userProfileId) {
    return (
      <ScreenContainerCentered
        isSignedOutModal
        description={t("dashboard.signout-desc")}
      >
        <div className="flex justify-center">{t("dashboard.signout-desc")}</div>
      </ScreenContainerCentered>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <CommunitiesPageLayout />
    </HydrationBoundary>
  );
}
