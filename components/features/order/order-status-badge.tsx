"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/shadcn/badge";

type OrderStatusBadgeProps = {
  isPaid: boolean;
  // null while the event data is still loading.
  eventStarted: boolean | null;
};

export function OrderStatusBadge({
  isPaid,
  eventStarted,
}: OrderStatusBadgeProps) {
  const t = useTranslations("order");

  if (isPaid) {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900/50">
        {t("status-paid")}
      </Badge>
    );
  }

  if (eventStarted) {
    return <Badge variant="secondary">{t("event-started-title")}</Badge>;
  }

  return (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900/50">
      {t("status-incomplete")}
    </Badge>
  );
}
