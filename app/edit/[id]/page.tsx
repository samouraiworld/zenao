import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { EditEventForm } from "./EditEventForm";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-user-roles";
import { userAddressOptions } from "@/lib/queries/user";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const { getToken, userId } = await auth();
  const queryClient = getQueryClient();
  const address = await queryClient.fetchQuery(
    userAddressOptions(getToken, userId),
  );
  void queryClient.prefetchQuery(eventOptions(p.id));
  void queryClient.prefetchQuery(eventUserRoles(p.id, address));

  return (
    <ScreenContainer>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EditEventForm id={p.id} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
