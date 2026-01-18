import { useTranslations } from "next-intl";
import Text from "@/components/widgets/texts/text";
import Heading from "@/components/widgets/texts/heading";

export default function BlogHeader() {
  const t = useTranslations("blog");

  return (
    <div className="flex flex-col gap-2">
      <Heading level={1} size="4xl" className="text-4xl truncate">
        {t("pageTitle")}
      </Heading>
      <Text variant="secondary" className="line-clamp-2">
        {t("pageSubheading")}
      </Text>
    </div>
  );
}
