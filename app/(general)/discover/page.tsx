import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { DiscoverEventsList } from "./discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { EventsListLayout } from "@/components/features/event/events-list-layout";
import { DEFAULT_EVENTS_LIMIT, eventsList } from "@/lib/queries/events-list";

export const revalidate = 60;

export default async function DiscoverPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  try {
    await queryClient.prefetchInfiniteQuery(
      eventsList(now, Number.MAX_SAFE_INTEGER, DEFAULT_EVENTS_LIMIT),
    );
  } catch {
    // Backend unreachable during SSR — client-side query will retry
  }

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout
          from="upcoming"
          title={t("title")}
          description={t("description")}
          tabLinks={{ upcoming: "/discover", past: "/discover/past" }}
        >
          <DiscoverEventsList from="upcoming" now={now} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
