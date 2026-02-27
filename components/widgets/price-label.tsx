import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { formatPrice } from "@/lib/pricing";
import { EventPriceGroup } from "@/app/gen/zenao/v1/zenao_pb";
import { SafeEventPriceGroup } from "@/types/schemas";

export const usePriceLabel = (
  pricesGroups: (SafeEventPriceGroup | EventPriceGroup)[],
) => {
  const t = useTranslations("event");
  return useMemo(() => {
    const priceGroups = pricesGroups ?? [];
    const prices = priceGroups.flatMap((group) => group.prices);
    if (prices.length === 0) {
      return t("price-free");
    }
    if (prices.length === 1) {
      if (Number(prices[0].amountMinor) === 0) {
        return t("price-free");
      }
      return formatPrice(prices[0].amountMinor, prices[0].currencyCode, {
        freeLabel: t("price-free"),
      });
    }
    const cheapest = prices.reduce((current, price) =>
      price.amountMinor < current.amountMinor ? price : current,
    );
    if (Number(cheapest.amountMinor) === 0) {
      return t("price-free-with-paid");
    }

    return t("price-from", {
      price: formatPrice(cheapest.amountMinor, cheapest.currencyCode, {
        freeLabel: t("price-free"),
      }),
    });
  }, [pricesGroups, t]);
};
