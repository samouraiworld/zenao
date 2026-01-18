import { getTranslations } from "next-intl/server";
import Text from "@/components/widgets/texts/text";
import Heading from "@/components/widgets/texts/heading";

export default async function BlogHeader() {
  const t = await getTranslations("blog");

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
