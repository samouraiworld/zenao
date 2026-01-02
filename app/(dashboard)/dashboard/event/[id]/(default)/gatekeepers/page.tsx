import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import GatekeepersTable from "./gatekeepers-table";
import { GatekeepersEditionContextProvider } from "./gatekeepers-edition-context-provider";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import withEventRoleRestrictions from "@/lib/permissions/with-roles-required";

interface DashboardEventGatekeepersPageProps {
  params: Promise<{ id: string }>;
}

async function DashboardEventGatekeepersPage({
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
      <GatekeepersEditionContextProvider
        eventId={eventId}
        eventInfo={eventInfo}
      >
        <GatekeepersTable eventId={eventId} />
      </GatekeepersEditionContextProvider>
    </HydrationBoundary>
  );
}

export default withEventRoleRestrictions(
  DashboardEventGatekeepersPage,
  ["organizer"],
  {
    notFoundOnFail: true,
  },
);
