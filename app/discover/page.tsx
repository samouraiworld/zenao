import { getTranslations } from "next-intl/server";
// import { SearchParams } from "nuqs";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { DiscoverEventsList } from "./discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/events-list-layout";
// import { loadEventFilterSearchParams } from "@/lib/searchParams";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

// type PageProps = {
//   searchParams: Promise<SearchParams>;
// };

export default async function DiscoverPage() {
  // { searchParams }: PageProps
  // const { from } = await loadEventFilterSearchParams(searchParams);
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  queryClient.prefetchQuery(eventsList(now, Number.MAX_SAFE_INTEGER, 20));
  queryClient.prefetchQuery(eventsList(now - 1, 0, 20));
  // switch (from) {
  //   case "upcoming":
  //     break;
  //   case "past":
  //     break;
  // }

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <Suspense>
          <EventsListLayout title={t("title")} description={t("description")}>
            <DiscoverEventsList now={now} />
          </EventsListLayout>
        </Suspense>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
