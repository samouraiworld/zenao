import { useTranslations } from "next-intl";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { EventsListLayout } from "@/components/layout/EventsListLayout";

export const revalidate = 60;

const DiscoverPageFC: React.FC<{
  upcoming: EventInfo[];
  past: EventInfo[];
}> = ({ upcoming, past }) => {
  const t = useTranslations("discover");
  return (
    <EventsListLayout
      upcoming={upcoming}
      past={past}
      title={t("title")}
      description={t("description")}
    />
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
      <DiscoverPageFC upcoming={upcoming} past={past} />
    </ScreenContainer>
  );
}
