"use client";

import { useState } from "react";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { Scanner } from "@yudiel/react-qr-scanner";
import { Loader2, RefreshCcw } from "lucide-react";
import { ec } from "elliptic";
import { keccak256 } from "viem";
import { useAccount } from "wagmi";
import { BN } from "bn.js";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { CheckinConfirmationDialog } from "@/components/dialogs/check-in-confirmation-dialog";
import { useEventCheckIn } from "@/lib/mutations/event-management";
import { userInfoOptions } from "@/lib/queries/user";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";
import { eventOptions } from "@/lib/queries/event";
import { Skeleton } from "@/components/shadcn/skeleton";
import { Button } from "@/components/shadcn/button";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

const p256 = new ec("p256");

const N = new BN(
  "FFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551",
  "hex",
);
const halfN = N.div(new BN(2));

type EventTicketScannerProps = {
  eventId: string;
  eventData: EventInfo;
};

const ticketSecretSchema = z
  .string()
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
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const [isLoading, setIsLoading] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const { checkIn } = useEventCheckIn();
  const [confirmDialogOpen, setConfirmationDialogOpen] = useState(false);
  const { address } = useAccount();

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
      if (!userRealmId || !address) {
        throw new Error("not authenticated !");
      }

      const b64 = value.replaceAll("_", "/").replaceAll("-", "+");
      const secret = ticketSecretSchema.parse(b64);
      const key = p256.keyFromPrivate(secret);

      const msgHash = keccak256(address, "bytes");

      console.log("msgHash", `0x${Buffer.from(msgHash).toString("hex")}`);

      const sig = key.sign(msgHash);

      console.log("ticket");

      const ticketPubkey = key.getPublic();

      console.log("px", ticketPubkey.getX().toString(10));
      console.log("py", ticketPubkey.getY().toString(10));

      const px = ticketPubkey.getX().toString("hex");
      const py = ticketPubkey.getY().toString("hex");
      const pkHex = px + py;
      const pubkeyBz = Buffer.from(pkHex, "hex");

      console.log("pubkey len", pubkeyBz.length);

      const pubkeyB64 = Buffer.from(pubkeyBz)
        .toString("base64")
        .replaceAll("=", "")
        .replaceAll("/", "_")
        .replaceAll("+", "-");

      console.log("pubkey", pubkeyB64);

      console.log("r", sig.r.toString(10));
      console.log("s", sig.s.toString(10));

      /*
       * IMPORTANT: OpenZeppelin's P256 verify disallows signatures where the `s` value is above `N/2` to prevent malleability.
       * To flip the `s` value, compute `s = N - s`.
       */
      let sigS = sig.s;
      if (sigS.gt(halfN)) {
        console.log("s > N / 2");
        sigS = N.sub(sigS);
      }

      const r = sig.r.toString("hex");
      const s = sigS.toString("hex");
      const sigHex = r + s;
      const sigBz = Buffer.from(sigHex, "hex");

      console.log("signature", sigHex);

      // Call mutation
      await checkIn({
        eventId,
        signature: sigBz,
        ticketPubkey: pubkeyBz,
      });

      trackEvent("EventCheckIn", {
        props: {
          eventId,
        },
      });

      updateHistory(sigHex);
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
