"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { CheckinConfirmationDialog } from "@/components/dialogs/check-in-confirmation-dialog";
import { useEventCheckIn } from "@/lib/mutations/event-management";

type EventTicketScannerProps = {
  eventId: string;
  eventData: EventInfo;
};

export function EventTicketScanner({
  eventId,
  eventData,
}: EventTicketScannerProps) {
  const { checkIn, isPending, isError } = useEventCheckIn();
  const [confirmDialogOpen, setConfirmationDialogOpen] = useState(false);
  const handleQRCodeValue = async (value: string) => {
    console.log(value);

    try {
      // Call mutation
      await checkIn({
        ticketSecret: value,
      });
    } catch (err) {
      console.error("Error", err);
    }
    setConfirmationDialogOpen(true);
  };

  return (
    <div className="max-w-[650px] mx-auto">
      <CheckinConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        loading={isPending}
        error={isError}
      />
      <Scanner
        onScan={(result) => handleQRCodeValue(result[0].rawValue)}
        allowMultiple
      />
    </div>
  );
}
