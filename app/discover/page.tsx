import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/EventsListLayout";

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
      <Suspense>
        <EventsListLayout
          upcoming={upcoming}
          past={past}
          title={t("title")}
          description={t("description")}
        />
      </Suspense>
    </ScreenContainer>
  );
}
