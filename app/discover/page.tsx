import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import { DiscoverEventsList } from "./discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/events-list-layout";

export const revalidate = 60;
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export default async function DiscoverPage() {
  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  // Prefetch upcoming
  queryClient.prefetchQuery(eventsList(now, Number.MAX_SAFE_INTEGER, 20));
  // Prefetch past
  queryClient.prefetchQuery(eventsList(now - 1, 0, 20));

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout title={t("title")} description={t("description")}>
          <Suspense>
            <DiscoverEventsList now={now} />
          </Suspense>
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
