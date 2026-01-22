"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/shadcn/alert";
import { Button } from "@/components/shadcn/button";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";
import { useConfirmTicketPayment } from "@/lib/mutations/confirm-ticket-payment";

type BannerStatus =
  | "idle"
  | "processing"
  | "checking"
  | "success"
  | "pending"
  | "canceled"
  | "error";

const processingDelayMs = [1_000, 10_000, 20_000];

export function PaymentStatusBanner() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");
  const orderId = searchParams.get("order_id") ?? "";
  const sessionId = searchParams.get("session_id") ?? "";

  const shouldShow =
    checkout === "success" || checkout === "cancel" || !!orderId;
  const [status, setStatus] = useState<BannerStatus>("idle");
  const [receiptReference, setReceiptReference] = useState<string>("");
  const t = useTranslations("event.payment-status-banner");
  const { confirmPayment } = useConfirmTicketPayment();
  const scheduledRef = useRef<number[] | null>(null);
  const clearScheduled = () => {
    scheduledRef.current?.forEach((timer) => window.clearTimeout(timer));
    scheduledRef.current = null;
  };

  const confirmStatus = useCallback(async () => {
    if (!orderId) {
      setStatus("error");
      return;
    }
    setStatus("checking");
    try {
      const response = await confirmPayment({
        orderId,
        checkoutSessionId: sessionId || undefined,
      });
      const responseStatus = response.status;
      if (responseStatus === "success") {
        setReceiptReference(response.receiptReference ?? "");
        setStatus("success");
        clearScheduled();
        return;
      }
      if (responseStatus === "pending") {
        setStatus("pending");
        clearScheduled();
        return;
      }
      setStatus("error");
      clearScheduled();
    } catch {
      setStatus("error");
      clearScheduled();
    }
  }, [confirmPayment, orderId, sessionId]);

  useEffect(() => {
    if (!shouldShow) {
      setStatus("idle");
      clearScheduled();
      return;
    }
    if (checkout === "cancel") {
      setStatus("canceled");
      clearScheduled();
      return;
    }
    if (!orderId) {
      setStatus("error");
      clearScheduled();
      return;
    }
    if (status === "idle") {
      setStatus("processing");
    }

    if (status === "processing" && !scheduledRef.current) {
      scheduledRef.current = processingDelayMs.map((delay) =>
        window.setTimeout(() => {
          void confirmStatus();
        }, delay),
      );
    }

    return () => {
      clearScheduled();
    };
  }, [status, checkout, confirmStatus, orderId, shouldShow]);

  if (!shouldShow || status === "idle") {
    return null;
  }

  const styles = {
    processing: "border-amber-200 bg-amber-50 text-amber-900",
    checking: "border-amber-200 bg-amber-50 text-amber-900",
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    pending: "border-slate-200 bg-slate-50 text-slate-900",
    canceled: "border-red-200 bg-red-50 text-red-900",
    error: "border-red-200 bg-red-50 text-red-900",
  } as const;

  const className = styles[status];
  const statusContent: Record<
    BannerStatus,
    {
      alertTitle: string;
      alertDescription: string;
      buttonTitle?: string;
      buttonAction?: () => void;
    }
  > = {
    idle: {
      alertTitle: "",
      alertDescription: "",
    },
    processing: {
      alertTitle: t("processing-title"),
      alertDescription: t("processing-description"),
    },
    checking: {
      alertTitle: t("checking-title"),
      alertDescription: t("checking-description"),
    },
    success: {
      alertTitle: t("success-title"),
      alertDescription: t("success-description"),
    },
    pending: {
      alertTitle: t("pending-title"),
      alertDescription: t("pending-description"),
      buttonTitle: t("pending-button"),
      buttonAction: confirmStatus,
    },
    canceled: {
      alertTitle: t("canceled-title"),
      alertDescription: t("canceled-description"),
    },
    error: {
      alertTitle: t("error-title"),
      alertDescription: t("error-description"),
      buttonTitle: t("error-button"),
      buttonAction: confirmStatus,
    },
  };

  const content = statusContent[status];

  return (
    <Alert className={cn("mb-6", className)}>
      <AlertTitle className="text-base">{content.alertTitle}</AlertTitle>
      <AlertDescription>
        {status === "success" ? (
          <div className="flex flex-col gap-2">
            <Text variant="secondary">{content.alertDescription}</Text>
            {receiptReference ? (
              <Text variant="secondary" size="sm" className="font-mono">
                {t("receipt-reference")}: {receiptReference}
              </Text>
            ) : null}
            {orderId ? (
              <Link href={`/order/${orderId}`} className="w-fit">
                <Button variant="outline" size="sm">
                  {t("view-order")}
                </Button>
              </Link>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Text variant="secondary">{content.alertDescription}</Text>
            {content.buttonTitle ? (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={content.buttonAction}
                >
                  {content.buttonTitle}
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
