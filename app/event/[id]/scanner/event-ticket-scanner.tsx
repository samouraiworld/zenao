"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { CheckinConfirmationDialog } from "@/components/dialogs/check-in-confirmation-dialog";

type EventTicketScannerProps = {
  eventId: string;
  eventData: EventInfo;
};

export function EventTicketScanner({
  eventId,
  eventData,
}: EventTicketScannerProps) {
  const [confirmDialogOpen, setConfirmationDialogOpen] = useState(false);
  const handleQRCodeValue = (value: string) => {
    console.log(value);
    setConfirmationDialogOpen(true);
  };

  return (
    <div className="max-w-[650px] mx-auto">
      <CheckinConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        error
      />
      <Scanner
        onScan={(result) => handleQRCodeValue(result[0].rawValue)}
        allowMultiple
      />
    </div>
  );
}
