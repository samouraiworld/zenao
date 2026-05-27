"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { PaymentStatusBanner } from "@/components/features/event/event-registration/payment-status-banner";
import {
  EventImage,
  EventImageSkeleton,
} from "@/components/features/event/event-image";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { eventOptions } from "@/lib/queries/event";

const normalizeReturnPath = (value: string | null) => {
  if (!value) {
    return "/";
  }
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("..")
  ) {
    return "/";
  }
  return value;
};

export default function CheckoutConfirmationPage() {
  const searchParams = useSearchParams();
  const returnPath = normalizeReturnPath(searchParams.get("return_path"));
  const eventId = useMemo(() => {
    const match = returnPath.match(/^\/event\/([^/?#]+)/);
    return match ? match[1] : "";
  }, [returnPath]);
  const eventQuery = useQuery({
    ...eventOptions(eventId),
    enabled: !!eventId,
  });

  return (
    <ScreenContainerCentered>
      <div className="flex w-full flex-col items-center gap-6">
        <div className="w-full max-w-xl text-center">
          <Heading level={1} size="2xl" className="mb-2">
            Payment confirmation
          </Heading>
          <Text variant="secondary">
            We are finalizing your purchase and will keep this page updated.
          </Text>
        </div>

        <div className="w-full max-w-xl">
          {eventQuery.isLoading ? (
            <EventImageSkeleton className="w-full" />
          ) : eventQuery.data ? (
            <div className="flex flex-col gap-3">
              <EventImage
                src={eventQuery.data.imageUri}
                sizes="(max-width: 768px) 100vw, 600px"
                fill
                alt={eventQuery.data.title}
                className="w-full"
                quality={70}
              />
              <Heading level={2} size="xl" className="text-center">
                {eventQuery.data.title}
              </Heading>
            </div>
          ) : null}
        </div>

        <div className="w-full max-w-xl">
          <PaymentStatusBanner />
        </div>

        <Link href={returnPath} className="w-full max-w-xs">
          <Button variant="outline" className="w-full">
            Back to event
          </Button>
        </Link>
      </div>
    </ScreenContainerCentered>
  );
}
