import Link from "next/link";
import { useTranslations } from "next-intl";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { EventsList } from "@/components/lists/EventsList";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";

const HeaderDiscover: React.FC = () => {
  const t = useTranslations("discover");
  return (
    <div className="flex flex-col gap-2 mb-3">
      <VeryLargeText>{t("title")}</VeryLargeText>
      <Link
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
        target="_blank"
      >
        <ButtonWithLabel className="w-auto" label={t("see-gnoweb")} />
      </Link>
    </div>
  );
};

const BodyDiscover: React.FC<{
  upcoming: EventInfo[];
  past: EventInfo[];
}> = ({ upcoming, past }) => {
  const t = useTranslations("discover");
  return (
    <div>
      <EventsList list={[...upcoming].reverse()} title={t("upcoming")} />
      <EventsList list={past} title={t("past")} />
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
