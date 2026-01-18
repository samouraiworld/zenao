import { useTranslations } from "next-intl";
import Text from "../texts/text";

type EmptyListProps = {
  title?: string;
  description?: string;
};

function EmptyList({ title, description }: EmptyListProps) {
  const t = useTranslations("empty-list");

  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">{title ?? t("title")}</Text>
      <Text size="sm" variant="secondary">
        {description ?? t("description")}
      </Text>
    </div>
  );
}

export default EmptyList;
