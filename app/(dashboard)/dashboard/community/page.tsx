import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import CommunitiesPageLayout from "./communities-page-layout";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import getActor from "@/lib/utils/actor";

export default async function DashboardCommunityPage() {
  const queryClient = getQueryClient();

  const t = await getTranslations();
  const actor = await getActor();

  if (!actor) {
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
