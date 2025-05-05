import { notFound } from "next/navigation";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { imageHeight, imageWidth } from "../constants";
import { getQueryClient } from "@/lib/get-query-client";
import { eventOptions } from "@/lib/queries/event";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { EventTicketScanner } from "./event-ticket-scanner";

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

  // TODO Verify role
  console.log(eventData);

  return (
    <ScreenContainer
      background={{
        src: eventData.imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      <HydrationBoundary state={dehydrate(queryClient)}>
        <EventTicketScanner eventId={p.id} eventData={eventData} />
      </HydrationBoundary>
    </ScreenContainer>
  );
}
