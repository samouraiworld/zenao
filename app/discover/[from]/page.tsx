import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect, RedirectType } from "next/navigation";
import { DiscoverEventsList } from "../discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { DEFAULT_EVENTS_LIMIT, eventsList } from "@/lib/queries/events-list";
import { EventsListLayout } from "@/components/layout/events-list-layout";

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

type PageProps = {
  params: Promise<{ from: string }>;
};

export default async function DiscoverPage({ params }: PageProps) {
  const { from } = await params;

  const queryClient = getQueryClient();
  const now = Date.now() / 1000;

  if (from !== "upcoming" && from !== "past") {
    redirect("/discover", RedirectType.replace);
  }

  queryClient.prefetchInfiniteQuery(
    from === "upcoming"
      ? eventsList(now, Number.MAX_SAFE_INTEGER, DEFAULT_EVENTS_LIMIT)
      : eventsList(now - 1, 0, DEFAULT_EVENTS_LIMIT),
  );

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout
          from={from}
          title={t("title")}
          description={t("description")}
          tabLinks={{ upcoming: "/discover", past: "/discover/past" }}
        >
          <DiscoverEventsList from={from} now={now} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
