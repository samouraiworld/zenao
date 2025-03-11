import { useTranslations } from "next-intl";
import Text from "@/components/texts/text";
import { VeryLargeText } from "@/components/texts/VeryLargeText";

export default function BlogHeader() {
  const t = useTranslations("blog");

  return (
    <div className="flex flex-col gap-2">
      <VeryLargeText className="truncate">{t("pageTitle")}</VeryLargeText>
      <Text className="line-clamp-2">{t("pageSubheading")}</Text>
    </div>
  );
}
