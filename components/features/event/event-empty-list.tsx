import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "../../shadcn/button";
import Text from "../../widgets/texts/text";

const EmptyEventsList: React.FC = () => {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col items-center gap-5 mt-10">
      <CalendarIcon
        strokeWidth={0.5}
        width={140}
        height={140}
        className="text-secondary-color"
      />
      <div className="text-center">
        <Text className="font-bold">{t("no-events")}</Text>
        <Text size="sm" variant="secondary">
          {t("no-events-desc")}
        </Text>
      </div>
      <Button variant="secondary">
        <Link href="/event/create">
          <Text size="sm" variant="secondary">
            {t("create-event")}
          </Text>
        </Link>
      </Button>
    </div>
  );
};

export default EmptyEventsList;
