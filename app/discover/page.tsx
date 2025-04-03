import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { SearchParams } from "nuqs";
import { DiscoverEventsList } from "./discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/events-list-layout";
import { loadEventFilterSearchParams } from "@/lib/searchParams";

export const revalidate = 60;
export const dynamicParams = true;
export const dynamic = "force-static";

export async function generateStaticParams() {
  return [];
}

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function DiscoverPage({ searchParams }: PageProps) {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  const { from } = await loadEventFilterSearchParams(searchParams);

  const upcoming = await queryClient.fetchQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, 20, {
      staleTime: 60000,
    }),
  );
  const past = await queryClient.fetchQuery(
    eventsList(now - 1, 0, 20, {
      staleTime: 60000,
    }),
  );

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout title={t("title")} description={t("description")}>
          <DiscoverEventsList from={from} upcoming={upcoming} past={past} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
