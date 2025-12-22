import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import ParticipantsTable from "./participants-table";
import { getQueryClient } from "@/lib/get-query-client";
import { eventUsersWithRole } from "@/lib/queries/event-users";

interface DashboardEventParticipantsPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventParticipantsPage({
  params,
}: DashboardEventParticipantsPageProps) {
  const { id: eventId } = await params;
  const queryClient = getQueryClient();

  queryClient.prefetchQuery(eventUsersWithRole(eventId, "participant"));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ParticipantsTable eventId={eventId} />
    </HydrationBoundary>
  );
}
