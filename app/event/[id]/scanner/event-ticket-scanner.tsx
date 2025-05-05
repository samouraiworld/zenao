"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

type EventTicketScannerProps = {
  eventId: string;
  eventData: EventInfo;
};

export function EventTicketScanner({
  eventId,
  eventData,
}: EventTicketScannerProps) {
  return <Scanner onScan={(result) => console.log(result)} />;
}
