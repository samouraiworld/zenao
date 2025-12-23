import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import GatekeepersTable from "./gatekeepers-table";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";

interface DashboardEventGatekeepersPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEventGatekeepersPage({
  params,
}: DashboardEventGatekeepersPageProps) {
  const { id: eventId } = await params;
  const queryClient = getQueryClient();

  let eventInfo;

  try {
    eventInfo = await queryClient.fetchQuery(eventOptions(eventId));
  } catch {
    notFound();
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GatekeepersTable eventId={eventId} eventInfo={eventInfo} />
    </HydrationBoundary>
  );
}
