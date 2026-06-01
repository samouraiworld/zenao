"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Carousel,
  CarouselContent,
  CarouselDot,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/shadcn/carousel";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { OrderStatusBadge } from "@/components/features/order/order-status-badge";
import { eventOptions } from "@/lib/queries/event";
import { orderDetails } from "@/lib/queries/order";
import { TicketCard } from "@/components/features/ticket/ticket-card";
import { makeLocationFromEvent } from "@/lib/location";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import { locationTimezone } from "@/lib/event-location";
import { formatPrice } from "@/lib/pricing";

type OrderDetailsProps = {
  orderId: string;
};

export function OrderDetails({ orderId }: OrderDetailsProps) {
  const { getToken } = useAuth();
  const t = useTranslations("order");

  const { data: orderData } = useSuspenseQuery(orderDetails(orderId, getToken));
  const order = orderData.order;
  const tickets = orderData.tickets ?? [];
  const isPaid = tickets.length > 0;

  const { data: event } = useSuspenseQuery(eventOptions(order?.eventId ?? ""));
  const eventStarted = Date.now() > Number(event.startDate) * 1000;
  const location = makeLocationFromEvent(event.location);
  const eventTimezone = locationTimezone(location);
  const timezone = useLayoutTimezone(eventTimezone);

  const totalLabel = formatPrice(
    order?.amountMinor ?? 0,
    order?.currencyCode ?? "",
    {
      freeLabel: t("free"),
    },
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="text-center">
        <Heading level={1} size="2xl" className="mb-2">
          {t("title")}
        </Heading>
        <Text variant="secondary">{t("subtitle")}</Text>
      </div>

      <div className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="font-semibold">{t("event-label")}</Text>
            <Link
              href={`/event/${order?.eventId ?? ""}`}
              className="text-sm text-right hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {event.title}
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="font-semibold">{t("order-id-label")}</Text>
            <Text variant="secondary" size="sm" className="font-mono">
              {order?.orderId ?? ""}
            </Text>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="font-semibold">{t("quantity-label")}</Text>
            <Text variant="secondary">{tickets.length}</Text>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="font-semibold">{t("total-label")}</Text>
            <Text variant="secondary">{totalLabel}</Text>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="font-semibold">{t("status-label")}</Text>
            <OrderStatusBadge isPaid={isPaid} eventStarted={eventStarted} />
          </div>
        </div>
      </div>

      {!isPaid ? (
        eventStarted ? (
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Heading level={2} size="lg">
                  {t("event-started-title")}
                </Heading>
                <Text variant="secondary">
                  {t("event-started-description")}
                </Text>
              </div>
              <div>
                <Link href={`/event/${order?.eventId ?? ""}`}>
                  <Button variant="outline">{t("view-event")}</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/40">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <Heading level={2} size="lg">
                  {t("payment-incomplete-title")}
                </Heading>
                <Text variant="secondary">
                  {t("payment-incomplete-description")}
                </Text>
              </div>
              <div>
                <Link href={`/event/${order?.eventId ?? ""}`}>
                  <Button>{t("continue-payment")}</Button>
                </Link>
              </div>
            </div>
          </div>
        )
      ) : (
        <Carousel>
          <CarouselContent>
            {tickets.map((ticketInfo, index) => (
              <CarouselItem key={`${ticketInfo.ticketSecret}-${index}`}>
                <div className="flex flex-col gap-2">
                  <Heading level={2}>
                    {t("ticket-label", { index: index + 1 })}
                  </Heading>
                  <TicketCard
                    eventId={order?.eventId ?? ""}
                    event={event}
                    timezone={timezone}
                    ticketInfo={ticketInfo}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="max-md:hidden" />
          <CarouselNext className="max-md:hidden" />
          <CarouselDot />
        </Carousel>
      )}
    </div>
  );
}
