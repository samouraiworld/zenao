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

export default async function CreateCommunityPage() {
  const queryClient = getQueryClient();

  const t = await getTranslations("community-create-form");

  // Fetch user
  const { getToken, userId: authId } = await auth();
  const token = await getToken();

  const userAddrOpts = userInfoOptions(getToken, authId);
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
