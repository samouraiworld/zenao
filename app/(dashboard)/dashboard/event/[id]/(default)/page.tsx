import { redirect } from "next/navigation";
import DashboardEventGeneral from "./dashboard-event-general";
import { getQueryClient } from "@/lib/get-query-client";
import { eventUserRoles } from "@/lib/queries/event-users";
import getActor from "@/lib/utils/actor";

export default async function DashboardEventDetailsDescriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;
  const queryClient = getQueryClient();
  const actor = await getActor();

  if (actor) {
    const roles = await queryClient.fetchQuery(
      eventUserRoles(eventId, actor.actingAs),
    );
    if (roles.includes("gatekeeper") && !roles.includes("organizer")) {
      redirect(`/dashboard/event/${eventId}/participants`);
    }
  }

  return <DashboardEventGeneral />;
}
