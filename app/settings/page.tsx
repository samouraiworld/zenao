import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EditUserForm } from "./EditUserForm";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { userAddressOptions, userOptions } from "@/lib/queries/user";

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  const userAddrOpts = userAddressOptions(getToken, userId);
  const address = await queryClient.fetchQuery(userAddrOpts);
  void queryClient.prefetchQuery(userOptions(address));

  return (
    <ScreenContainer isSignedOutModal={!userId}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {!!userId && <EditUserForm userId={userId} />}
      </HydrationBoundary>
    </ScreenContainer>
  );
}
