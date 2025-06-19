import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { EditEventForm } from "./edit-event-form";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getQueryClient } from "@/lib/get-query-client";
import { eventGatekeepersEmails, eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";
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

  try {
    await queryClient.fetchQuery({
      ...eventOptions(p.id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  queryClient.prefetchQuery(eventGatekeepersEmails(p.id, getToken));
  queryClient.prefetchQuery(eventUserRoles(p.id, address));

  return (
    <ScreenContainer isSignedOutModal={!userId}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        {userId && <EditEventForm id={p.id} userId={userId} />}
      </HydrationBoundary>
    </ScreenContainer>
  );
}
