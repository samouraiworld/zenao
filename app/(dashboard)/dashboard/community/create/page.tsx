import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getTranslations } from "next-intl/server";
import { auth } from "@clerk/nextjs/server";
import CreateCommunityForm from "./create-community-form";
import { getQueryClient } from "@/lib/get-query-client";
import { userInfoOptions } from "@/lib/queries/user";
import {
  ScreenContainer,
  ScreenContainerCentered,
} from "@/components/layout/screen-container";
import {
  getActiveAccountServer,
  getTeamIdFromActiveAccount,
} from "@/lib/active-account/server";

export default async function CreateCommunityPage() {
  const queryClient = getQueryClient();

  const t = await getTranslations("community-create-form");

  const { getToken, userId: authId } = await auth();
  const token = await getToken();

  const activeAccount = await getActiveAccountServer();
  const teamId = getTeamIdFromActiveAccount(activeAccount);

  const userAddrOpts = userInfoOptions(getToken, authId, teamId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;

  if (!token || !userProfileId) {
    return (
      <ScreenContainerCentered isSignedOutModal>
        <div className="flex flex-col items-center mx-auto md:max-w-5xl">
          {t("log-in")}
        </div>
      </ScreenContainerCentered>
    );
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <CreateCommunityForm dashboard />
      </ScreenContainer>
    </HydrationBoundary>
  );
}
