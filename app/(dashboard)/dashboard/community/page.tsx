import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import { communitiesListByMember } from "@/lib/queries/community";

export default async function DashboardCommunityPage() {
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  const token = await getToken();

  const t = await getTranslations();

  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userRealmId = userInfo?.realmId;

  if (!token || !userRealmId) {
    return (
      <ScreenContainerCentered
        isSignedOutModal
        description={t("dashboard.signout-desc")}
      >
        <div className="flex justify-center">{t("dashboard.signout-desc")}</div>
      </ScreenContainerCentered>
    );
  }

  // queryClient.prefetchQuery(communitiesListByMember)

  return <div>Dashboard Community Page</div>;
}
