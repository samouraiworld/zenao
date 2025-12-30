import { notFound, redirect, RedirectType } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { userInfoOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";
import { EventTicketScanner } from "@/app/(general)/event/[id]/scanner/event-ticket-scanner";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ScannerPage({ params }: Props) {
  const p = await params;

  const queryClient = getQueryClient();

  const { getToken, userId } = await auth();
  const userAddrOpts = userInfoOptions(getToken, userId);
  const userInfo = await queryClient.fetchQuery(userAddrOpts);
  const userRealmId = userInfo?.realmId;

  let eventData;
  try {
    eventData = await queryClient.fetchQuery({
      ...eventOptions(p.id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  const roles = await queryClient.fetchQuery(eventUserRoles(p.id, userRealmId));

  if (!roles.includes("gatekeeper") && !roles.includes("organizer")) {
    redirect(`/event/${p.id}`, RedirectType.replace);
  }

  return (
    <EventScreenContainer id={p.id}>
      <EventTicketScanner eventId={p.id} eventData={eventData} />
    </EventScreenContainer>
  );
}
