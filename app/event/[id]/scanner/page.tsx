import { notFound, redirect, RedirectType } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { auth } from "@clerk/nextjs/server";
import { EventTicketScanner } from "./event-ticket-scanner";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { userInfoOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ScannerPage({ params }: Props) {
  const p = await params;
  const queryClient = getQueryClient();

  const { getToken, userId } = await auth();
  const userAddrOpts = userInfoOptions(getToken, userId);
  const address = await queryClient.fetchQuery(userAddrOpts);

  let eventData;
  try {
    eventData = await queryClient.fetchQuery({
      ...eventOptions(p.id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  const roles = await queryClient.fetchQuery(eventUserRoles(p.id, address));

  if (!roles.includes("gatekeeper") && !roles.includes("organizer")) {
    redirect(`/event/${p.id}`, RedirectType.replace);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventTicketScanner eventId={p.id} eventData={eventData} />
    </HydrationBoundary>
  );
}
