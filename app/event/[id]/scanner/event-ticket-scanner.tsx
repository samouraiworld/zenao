"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import * as ed from "@noble/ed25519";
import { useTranslations } from "next-intl";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { CheckinConfirmationDialog } from "@/components/dialogs/check-in-confirmation-dialog";
import { useEventCheckIn } from "@/lib/mutations/event-management";
import { userAddressOptions } from "@/lib/queries/user";

type EventTicketScannerProps = {
  eventId: string;
  eventData: EventInfo;
};

const ticketSecretSchema = z
  .string()
  .refine((value) => Buffer.from(value, "base64").length === 32, {
    message: "Invalid secret length",
  })
  .transform((value) => Buffer.from(value, "base64"));

export function EventTicketScanner({ eventData }: EventTicketScannerProps) {
  void eventData; // TODO use to display metadata
  const t = useTranslations("check-in-confirmation-dialog");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { checkIn, isPending } = useEventCheckIn();
  const [confirmDialogOpen, setConfirmationDialogOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const handleQRCodeValue = async (value: string) => {
    setError(null);

    try {
      const token = await getToken();
      if (!userAddress || !token) {
        throw new Error("not authenticated !");
      }

      const b64 = value.replaceAll("_", "/").replaceAll("-", "+");
      const ticket = ticketSecretSchema.parse(b64);
      const signature = Buffer.from(
        await ed.signAsync(Buffer.from(userAddress), ticket),
      )
        .toString("base64")
        .replaceAll("=", "")
        .replaceAll("/", "_")
        .replaceAll("+", "-");

      const ticketPubkey = Buffer.from(await ed.getPublicKeyAsync(ticket))
        .toString("base64")
        .replaceAll("=", "")
        .replaceAll("/", "_")
        .replaceAll("+", "-");

      // Call mutation
      await checkIn({
        signature,
        ticketPubkey,
        token,
      });
    } catch (err) {
      console.error("Error", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("description-error"));
      }
    }
    setConfirmationDialogOpen(true);
  };

  return (
    <div className="max-w-[650px] mx-auto">
      <CheckinConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        loading={isPending}
        error={error}
      />
      <Scanner
        onScan={(result) => handleQRCodeValue(result[0].rawValue)}
        allowMultiple
        scanDelay={2000}
      />

      {/* TODO Historique local  ? */}
    </div>
  );
}
