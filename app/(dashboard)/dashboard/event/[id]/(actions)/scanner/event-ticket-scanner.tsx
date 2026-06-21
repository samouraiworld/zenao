"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { ConnectError } from "@connectrpc/connect";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import * as ed from "@noble/ed25519";
import { useTranslations } from "next-intl";
import { Loader2, RefreshCcw, Zap, ZapOff } from "lucide-react";
import BarcodeScanner from "./scanner";
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
import { SafeEventInfo } from "@/types/schemas";

type EventTicketScannerProps = {
  eventId: string;
  eventData: SafeEventInfo;
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
  const { trackEvent } = useAnalyticsEvents();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";
  const [isLoading, setIsLoading] = useState(false);
  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const { checkIn } = useEventCheckIn();
  const [confirmDialogOpen, setConfirmationDialogOpen] = useState(false);

  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);
  const cameraContainerRef = useRef<HTMLDivElement>(null);

  // React doesn't reliably set the `muted` *attribute* on <video> elements, so
  // Android Chrome blocks autoplay and the react-webcam preview stays black
  // (desktop autoplay is laxer, which is why it works there). Force the
  // attributes on the rendered <video> and kick off playback when the stream
  // attaches.
  useEffect(() => {
    const video = cameraContainerRef.current?.querySelector("video");
    if (!video) {
      return;
    }
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    const play = () => {
      video.play().catch(() => {});
    };
    play();
    video.addEventListener("loadedmetadata", play);
    return () => video.removeEventListener("loadedmetadata", play);
  }, []);

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
      if (!userProfileId || !token) {
        throw new Error("not authenticated !");
      }

      const b64 = value.replaceAll("_", "/").replaceAll("-", "+");
      const ticket = ticketSecretSchema.parse(b64);
      const signature = Buffer.from(
        await ed.signAsync(Buffer.from(userProfileId), ticket),
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

      trackEvent("EventCheckIn", {
        props: {
          eventId,
        },
      });

      updateHistory(signature);
    } catch (err) {
      console.error("checkin error", err);
      if (err instanceof z.ZodError) {
        // The scanned QR isn't a ticket secret (wrong format/length).
        setError(t("check-in-confirmation-dialog.description-invalid-ticket"));
      } else if (err instanceof ConnectError) {
        // Backend rejection (already checked in, unknown ticket, ...).
        // rawMessage drops the "[code]" prefix that ConnectError.message adds.
        setError(err.rawMessage);
      } else if (err instanceof Error) {
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
          <div
            ref={cameraContainerRef}
            className="relative aspect-square w-full overflow-hidden rounded bg-black [&_video]:absolute [&_video]:inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          >
            <BarcodeScanner
              facingMode="environment"
              torch={torch}
              // BarcodeScanner streams continuously: onUpdate fires on every
              // frame, with a result only when a code is decoded (otherwise the
              // first arg is a NotFoundException we ignore). We gate on the
              // loading/dialog state rather than stopping the stream, to avoid
              // re-initialising the camera (slow and flickery on mobile).
              onUpdate={(_err, result) => {
                if (!result || isLoading || confirmDialogOpen) {
                  return;
                }
                setScannerError(null);
                handleQRCodeValue(result.getText());
              }}
              onError={(err) => {
                console.error("scanner camera error", err);
                setScannerError(typeof err === "string" ? err : err.message);
              }}
            />

            {/* Scanning viewfinder (corner brackets) */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-2/3 w-2/3">
                <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-white/90" />
                <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-white/90" />
                <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-white/90" />
                <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-white/90" />
              </div>
            </div>

            {/* Flashlight toggle */}
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={() => setTorch((value) => !value)}
              aria-label={t("toggle-flashlight")}
              className="absolute bottom-3 right-3 z-10 rounded-full opacity-90"
            >
              {torch ? <ZapOff /> : <Zap />}
            </Button>
          </div>
          {scannerError && (
            <div className="mt-2 rounded bg-destructive/10 p-3">
              <Text className="text-destructive">Camera: {scannerError}</Text>
            </div>
          )}
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
