"use client";

import { useTranslations } from "next-intl";
import { format as formatTZ } from "date-fns-tz";
import Text from "@/components/widgets/texts/text";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";

export const PostPublishedAt = ({ publishedAt }: { publishedAt: Date }) => {
  const t = useTranslations("blog");
  const timeZone = useLayoutTimezone();

  return (
    <Text className="self-start text-gray-500">
      {t("publishedAt")}:{" "}
      {formatTZ(new Date(publishedAt), "dd-MM-yyyy", { timeZone })}
    </Text>
  );
};
