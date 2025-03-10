import { getTranslations } from "next-intl/server";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { eventsList } from "@/lib/queries/events-list";
import { EventsListContainer } from "@/components/layout/events-list-container";

export const revalidate = 60;

export default async function DiscoverPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;
  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 20),
  );
  const past = await queryClient.fetchQuery(eventsList(now - 1, 0, 20));
  const t = await getTranslations("discover");

  return (
    <ScreenContainer>
      <EventsListContainer
        upcoming={upcoming}
        past={past}
        title={t("title")}
        description={t("description")}
      />
    </ScreenContainer>
  );
}
