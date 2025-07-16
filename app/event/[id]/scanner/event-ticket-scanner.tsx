"use client";

import { useState } from "react";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import * as ed from "@noble/ed25519";
import { useTranslations } from "next-intl";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Loader2, RefreshCcw } from "lucide-react";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { CheckinConfirmationDialog } from "@/components/dialogs/check-in-confirmation-dialog";
import { useEventCheckIn } from "@/lib/mutations/event-management";
import { userAddressOptions } from "@/lib/queries/user";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";
import { eventOptions } from "@/lib/queries/event";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Button } from "@/components/shadcn/button";

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

export function EventTicketScanner({
  eventId,
  eventData,
}: EventTicketScannerProps) {
  const t = useTranslations("event-scanner");
  const { getToken, userId } = useAuth();
  const {
    data: { checkedIn },
    isFetching,
    refetch,
  } = useSuspenseQuery(eventOptions(eventId));
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
      const upToDate = [newSig, ...old];
      return upToDate;
    });
  };

  const handleQRCodeValue = async (value: string) => {
    setError(null);
    setIsLoading(true);

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
        eventId,
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
      setConfirmationDialogOpen(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Loading overlay */}
      <div
        className={cn(
          "w-screen h-screen absolute top-0 left-0 z-50 bg-black/80 justify-center items-center",
          isLoading ? "flex" : "hidden",
        )}
      >
        <Loader2 size={24} className="animate-spin text-white" />
      </div>
      <CheckinConfirmationDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
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
          <div className="flex gap-2 items-center">
            <Heading level={2}>
              {t("checkin-count")}: {isFetching ? <Skeleton /> : checkedIn}
            </Heading>
            <Button
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw />
            </Button>
          </div>

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
