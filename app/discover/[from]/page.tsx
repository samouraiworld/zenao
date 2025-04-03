import { getTranslations } from "next-intl/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect, RedirectType } from "next/navigation";
import { DiscoverEventsList } from "../discover-events-list";
import { getQueryClient } from "@/lib/get-query-client";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { eventsList } from "@/lib/queries/events-list";
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

  queryClient.prefetchQuery(
    from === "upcoming"
      ? eventsList(now, Number.MAX_SAFE_INTEGER, 20)
      : eventsList(now - 1, 0, 20, {
          staleTime: 60000,
        }),
  );

  const t = await getTranslations("discover");

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ScreenContainer>
        <EventsListLayout
          from={from}
          title={t("title")}
          description={t("description")}
        >
          <DiscoverEventsList from={from} now={now} />
        </EventsListLayout>
      </ScreenContainer>
    </HydrationBoundary>
  );
}
