import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EditUserForm } from "./edit-user";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { userInfoOptions } from "@/lib/queries/user";
import { profileOptions } from "@/lib/queries/profile";

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userProfileId = userInfo?.userId;
  void queryClient.prefetchQuery(profileOptions(userProfileId));

  return (
    <ScreenContainer isSignedOutModal={!userId}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {!!userId && <EditUserForm userId={userId} />}
      </HydrationBoundary>
    </ScreenContainer>
  );
}
