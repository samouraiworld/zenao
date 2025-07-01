"use client";

import { useState } from "react";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import * as ed from "@noble/ed25519";
import { useTranslations } from "next-intl";
import { Scanner } from "@yudiel/react-qr-scanner";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { CheckinConfirmationDialog } from "@/components/dialogs/check-in-confirmation-dialog";
import { useEventCheckIn } from "@/lib/mutations/event-management";
import { userAddressOptions } from "@/lib/queries/user";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";

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
  const t = useTranslations("event-scanner");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const { checkIn } = useEventCheckIn();
  const [confirmDialogOpen, setConfirmationDialogOpen] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updateHistory = (newSig: string) => {
    setLastSignature(newSig);
    setHistory((old) => {
      console.log("old", old);
      const upToDate = [newSig, ...old];
      return upToDate;
    });
  };

  const handleQRCodeValue = async (value: string) => {
    setError(null);
    setIsLoading(true);
    setConfirmationDialogOpen(true);

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

      updateHistory(signature);
    } catch (err) {
      console.error("Error", err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("check-in-confirmation-dialog.description-error"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <CheckinConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        loading={isLoading}
        error={error}
      />

      <div className="w-full grid grid-cols-2 gap-8">
        <div className="md:max-w-[650px] max-md:col-span-2 self-start">
          <Scanner
            onScan={(result) => handleQRCodeValue(result[0].rawValue)}
            allowMultiple
            paused={isLoading || confirmDialogOpen}
            classNames={{
              container: "md:max-w-[650px] max-md:col-span-2 self-center",
            }}
          />
        </div>

        <div className="flex flex-col h-full max-md:col-span-2 gap-6">
          <Heading level={2}>
            {t("history-title")}: {eventData.title}
          </Heading>

          <div className="overflow-auto">
            {lastSignature && (
              <Text>
                {t("last-ticket-scanned")}: {lastSignature.slice(-6)}
              </Text>
            )}
          </div>

          <div className="flex flex-col bg-secondary">
            {history.length === 0 && (
              <div className="p-4">
                <Text>{t("no-tickets-scanned")}</Text>
              </div>
            )}

            <div className="max-h-[524px] overflow-auto">
              {history.map((sig) => (
                <div key={sig} className="p-4 hover:bg-accent">
                  <Text>
                    {t("signature")}: {sig}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
