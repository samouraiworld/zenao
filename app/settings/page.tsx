import { auth } from "@clerk/nextjs/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { EditUserForm } from "./EditUserForm";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { userOptions } from "@/lib/queries/user";

export default async function SettingsPage() {
  const queryClient = getQueryClient();
  const { getToken } = await auth();
  const authToken = await getToken();

  void queryClient.prefetchQuery(userOptions(authToken));

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EditUserForm authToken={authToken} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
