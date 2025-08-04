"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import EmptyList from "@/components/widgets/lists/empty-list";
import { DEFAULT_EVENTS_LIMIT, eventsList } from "@/lib/queries/events-list";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { EventCard } from "@/components/features/event/event-card";
import { idFromPkgPath } from "@/lib/queries/event";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import Heading from "@/components/widgets/texts/heading";

type CommunityEventsProps = {
  communityId: string;
  now: number;
};

function CommunityEvents({ communityId: _, now }: CommunityEventsProps) {
  const t = useTranslations();
  // TODO Change endpoints
  const {
    data: upcomingEventsPages,
    isFetchingNextPage: isFetchingUpcomingNextPage,
    hasNextPage: hasNextUpcomingPage,
    isFetching: isFetchingUpcoming,
    fetchNextPage: fetchNextUpcomingPage,
  } = useSuspenseInfiniteQuery(
    eventsList(now, Number.MAX_SAFE_INTEGER, DEFAULT_EVENTS_LIMIT, {
      staleTime: 60000,
    }),
  );
  const {
    data: pastEventsPages,
    isFetchingNextPage: isFetchingPastNextPage,
    hasNextPage: hasNextPastPage,
    isFetching: isFetchingPast,
    fetchNextPage: fetchNextPastPage,
  } = useSuspenseInfiniteQuery(
    eventsList(now - 1, 0, DEFAULT_EVENTS_LIMIT, {
      staleTime: 60000,
    }),
  );

  const upcomingEvents = useMemo(
    () => upcomingEventsPages.pages.flat(),
    [upcomingEventsPages],
  );

  const pastEvents = useMemo(
    () => pastEventsPages.pages.flat(),
    [pastEventsPages],
  );

  return (
    <div className="space-y-8">
      <Heading level={2} size="lg">
        Hosting events ({upcomingEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {upcomingEvents.length === 0 && (
          <EmptyList
            title={t("no-events-title")}
            description={t("no-events-description")}
          />
        )}
        <EventCardListLayout>
          {upcomingEvents.map((evt) => (
            <EventCard
              href={`/event/${idFromPkgPath(evt.pkgPath)}`}
              key={evt.pkgPath}
              evt={evt}
            />
          ))}
        </EventCardListLayout>

        <LoaderMoreButton
          fetchNextPage={fetchNextUpcomingPage}
          hasNextPage={hasNextUpcomingPage}
          isFetching={isFetchingUpcoming}
          isFetchingNextPage={isFetchingUpcomingNextPage}
          page={upcomingEvents}
          noMoreLabel=""
        />
      </div>

      <Heading level={2} size="lg">
        Past events ({pastEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {upcomingEvents.length === 0 && (
          <EmptyList
            title={t("no-events-title")}
            description={t("no-events-description")}
          />
        )}

        <EventCardListLayout>
          {pastEvents.map((evt) => (
            <EventCard
              href={`/event/${idFromPkgPath(evt.pkgPath)}`}
              key={evt.pkgPath}
              evt={evt}
            />
          ))}
        </EventCardListLayout>

        <div className="mt-8">
          <LoaderMoreButton
            fetchNextPage={fetchNextPastPage}
            hasNextPage={hasNextPastPage}
            isFetching={isFetchingPast}
            isFetchingNextPage={isFetchingPastNextPage}
            page={pastEvents}
            noMoreLabel=""
          />
        </div>
      </div>
    </div>
  );
}

export default CommunityEvents;
