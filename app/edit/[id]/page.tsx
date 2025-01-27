import { HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { EditEventForm } from "./EditEventForm";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions, eventUserOrganizer } from "@/lib/queries/event";

export default async function EditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const p = await params;
  const { getToken } = await auth();
  const authToken = await getToken();
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(eventOptions(p.id));
  void queryClient.prefetchQuery(eventUserOrganizer(authToken, p.id));

  return (
    <ScreenContainer>
      <HydrationBoundary>
        <EditEventForm id={p.id} authToken={authToken} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
