"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { format, fromUnixTime } from "date-fns";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { userOrders } from "@/lib/queries/order";
import { formatPrice } from "@/lib/pricing";

export function OrdersList() {
  const { getToken } = useAuth();
  const t = useTranslations("orders");
  const { data } = useSuspenseQuery(userOrders(getToken));
  const orders = data.orders ?? [];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="text-center">
        <Heading level={1} size="2xl" className="mb-2">
          {t("title")}
        </Heading>
        <Text variant="secondary">{t("subtitle")}</Text>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center">
          <Text variant="secondary">{t("empty")}</Text>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const createdAt = order.createdAt ? Number(order.createdAt) : 0;
            const totalLabel = formatPrice(
              order.amountMinor,
              order.currencyCode,
              {
                freeLabel: t("free"),
              },
            );
            return (
              <Link
                key={order.orderId}
                href={`/order/${order.orderId}`}
                className="rounded-lg border border-slate-200 bg-white p-4 transition hover:border-slate-300"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">{t("order-id-label")}</Text>
                    <Text variant="secondary" className="font-mono">
                      {order.orderId}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">{t("date-label")}</Text>
                    <Text variant="secondary">
                      {createdAt > 0
                        ? format(fromUnixTime(createdAt), "PPpp")
                        : t("date-unknown")}
                    </Text>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Text className="font-semibold">{t("total-label")}</Text>
                    <Text variant="secondary">{totalLabel}</Text>
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
