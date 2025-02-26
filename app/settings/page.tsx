import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EditUserForm } from "./EditUserForm";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { userAddressOptions } from "@/lib/queries/user";

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  const { getToken, userId } = await auth();
  void queryClient.prefetchQuery(userAddressOptions(getToken, userId));

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EditUserForm />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
