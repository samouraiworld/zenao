"use client";

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

  const { data: event } = useSuspenseQuery(eventOptions(order?.eventId ?? ""));
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="text-center">
        <Heading level={1} size="2xl" className="mb-2">
          {t("title")}
        </Heading>
        <Text variant="secondary">{t("subtitle")}</Text>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-2 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Text className="font-semibold">{t("order-id-label")}</Text>
            <Text variant="secondary" className="font-mono">
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
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center">
          <Text variant="secondary">{t("no-tickets")}</Text>
        </div>
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
