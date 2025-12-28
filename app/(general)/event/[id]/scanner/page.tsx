import { notFound } from "next/navigation";
import { EventTicketScanner } from "./event-ticket-scanner";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { EventScreenContainer } from "@/components/features/event/event-screen-container";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ScannerPage({ params }: Props) {
  const p = await params;

  const queryClient = getQueryClient();

  let eventData;
  try {
    eventData = await queryClient.fetchQuery({
      ...eventOptions(p.id),
    });
  } catch (err) {
    console.error("error", err);
    notFound();
  }

  return (
    <EventScreenContainer id={p.id}>
      <EventTicketScanner eventId={p.id} eventData={eventData} />
    </EventScreenContainer>
  );
}
