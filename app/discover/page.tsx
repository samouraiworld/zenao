import { getTranslations } from "next-intl/server";
import { SearchParams } from "nuqs";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { DiscoverEventsList } from "./discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/events-list-layout";
import { loadEventFilterSearchParams } from "@/lib/searchParams";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function DiscoverPage({ searchParams }: PageProps) {
  const { from } = await loadEventFilterSearchParams(searchParams);
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  switch (from) {
    case "upcoming":
      queryClient.prefetchQuery(eventsList(now, Number.MAX_SAFE_INTEGER, 20));
      break;
    case "past":
      queryClient.prefetchQuery(eventsList(now - 1, 0, 20));
      break;
  }

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout title={t("title")} description={t("description")}>
          <DiscoverEventsList now={now} from={from} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
