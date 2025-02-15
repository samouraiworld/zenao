import { useTranslations } from "next-intl";
import { LargeText } from "../texts/LargeText";
import { EventCard } from "../cards/EventCard";
import { Text } from "../texts/DefaultText";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";

export const EventsList: React.FC<{
  list: EventInfo[];
  title: string;
}> = ({ list, title }) => {
  const t = useTranslations("created");
  return (
    <div className="mb-4">
      <LargeText className="mb-2">{title}</LargeText>
      {!list.length ? (
        <Text>{t("no-events")}</Text>
      ) : (
        list.map((evt) => <EventCard key={evt.pkgPath} evt={evt} />)
      )}
    </div>
  );
};
