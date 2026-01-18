"use client";

import { useTranslations } from "next-intl";
import { Card } from "./cards/card";
import { BaseLogo } from "./icons";
import Text from "./texts/text";
import { cn } from "@/lib/tailwind";

export default function SoonOnBase({ className }: { className?: string }) {
  const t = useTranslations("components.widgets.soon-on-base");

  return (
    <Card
      className={cn(
        "py-1 px-2 flex flex-row items-center flex-wrap",
        className,
      )}
    >
      <Text size="sm" variant="secondary" className="pr-1.5">
        {t("soon-on")}
      </Text>
      <BaseLogo className="h-3 fill-[#1652F0]" />
    </Card>
  );
}
