import Link from "next/link";
import { useTranslations } from "next-intl";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList, EventsListSchemaType } from "@/lib/queries/events-list";
import { EventCard } from "@/components/cards/EventCard";
import { LargeText } from "@/components/texts/LargeText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";

const HeaderDiscover: React.FC = () => {
  const t = useTranslations("discover");
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-center mb-3">
      <VeryLargeText>{t("title")}</VeryLargeText>
      <Link
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
        target="_blank"
      >
        -&gt;
        {t("see-gnoweb")}
      </Link>
    </div>
  );
};

const BodyDiscover: React.FC<{
  upcoming: EventsListSchemaType;
  past: EventsListSchemaType;
}> = ({ upcoming, past }) => {
  const t = useTranslations("discover");
  return (
    <div>
      <LargeText className="mb-2">{t("upcoming")}</LargeText>
      {[...upcoming].reverse().map((evt) => (
        <EventCard key={evt.pkgPath} evt={evt} />
      ))}
      <LargeText className="mb-2">{t("past")}</LargeText>
      {past.map((evt) => (
        <EventCard key={evt.pkgPath} evt={evt} />
      ))}
    </div>
  );
};

export default async function DiscoverPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(eventsList(now - 1, 0, 20));

  return (
    <ScreenContainer>
      <HeaderDiscover />
      <BodyDiscover upcoming={upcoming} past={past} />
    </ScreenContainer>
  );
}
