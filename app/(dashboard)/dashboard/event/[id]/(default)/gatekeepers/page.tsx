import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import GatekeepersTable from "./gatekeepers-table";
import { getQueryClient } from "@/lib/get-query-client";

interface DashboardEventGatekeepersPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventGatekeepersPage({
  params,
}: DashboardEventGatekeepersPageProps) {
  const { id: eventId } = await params;
  const queryClient = getQueryClient();

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GatekeepersTable eventId={eventId} />
    </HydrationBoundary>
  );
}
