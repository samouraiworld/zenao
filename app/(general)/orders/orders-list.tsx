"use client";

import Link from "next/link";
import { useSuspenseQuery, useQueries } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { OrderStatusBadge } from "@/components/features/order/order-status-badge";
import { userOrders } from "@/lib/queries/order";
import { eventOptions } from "@/lib/queries/event";
import { formatPrice } from "@/lib/pricing";

export function OrdersList() {
  const { getToken } = useAuth();
  const t = useTranslations("orders");
  const tOrder = useTranslations("order");
  const { data } = useSuspenseQuery(userOrders(getToken));
  const orders = data.orders ?? [];

  const eventQueries = useQueries({
    queries: orders.map((order) => eventOptions(order.eventId)),
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="text-center">
        <Heading level={1} size="2xl" className="mb-2">
          {t("title")}
        </Heading>
        <Text variant="secondary">{t("subtitle")}</Text>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-6 text-center">
          <Text variant="secondary">{t("empty")}</Text>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order, index) => {
            const totalLabel = formatPrice(
              order.amountMinor,
              order.currencyCode,
              { freeLabel: tOrder("free") },
            );

            const eventQuery = eventQueries[index];
            const eventTitle = eventQuery.data?.title;
            const eventStarted = eventQuery.data
              ? Date.now() > Number(eventQuery.data.startDate) * 1000
              : null;

            return (
              <Link
                key={order.orderId}
                href={`/order/${order.orderId}`}
                className="block rounded-lg border bg-card p-5 shadow-sm transition hover:bg-accent"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">
                      {tOrder("event-label")}
                    </Text>
                    {eventTitle ? (
                      <Text
                        variant="secondary"
                        size="sm"
                        className="text-right"
                      >
                        {eventTitle}
                      </Text>
                    ) : (
                      <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">
                      {tOrder("order-id-label")}
                    </Text>
                    <Text variant="secondary" size="sm" className="font-mono">
                      {order.orderId}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">
                      {tOrder("total-label")}
                    </Text>
                    <Text variant="secondary">{totalLabel}</Text>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">
                      {tOrder("status-label")}
                    </Text>
                    <OrderStatusBadge
                      isPaid={order.status === "success"}
                      eventStarted={eventStarted}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
