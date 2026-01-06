"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { EventCard } from "@/components/features/event/event-card";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import Heading from "@/components/widgets/texts/heading";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { eventIdFromPkgPath } from "@/lib/queries/event";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerList,
} from "@/lib/queries/events-list";
import { userInfoOptions } from "@/lib/queries/user";
import { addressFromRealmId } from "@/lib/gno";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";

type ProfileEventsProps = {
  userId: string;
  now: number;
};

export default function ProfileEvents({ userId, now }: ProfileEventsProps) {
  const t = useTranslations("profile-info");

  const realmId = `gno.land/r/zenao/users/u${userId}`;

  const { getToken, userId: currentUserId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, currentUserId),
  );
  const userRealmId = userInfo?.realmId || "";
  const address = addressFromRealmId(userRealmId);
  const loggedUserAddress = addressFromRealmId(userInfo?.realmId);
  const isOwner = loggedUserAddress === address;

  // The connected user can see his both discoverable and undiscoverable events
  const discoverableFilter = isOwner
    ? DiscoverableFilter.UNSPECIFIED
    : DiscoverableFilter.DISCOVERABLE;

  const {
    data: upcomingEventsPages,
    isFetchingNextPage: isFetchingUpcomingNextPage,
    hasNextPage: hasNextUpcomingPage,
    isFetching: isFetchingUpcoming,
    fetchNextPage: fetchNextUpcomingPage,
  } = useSuspenseInfiniteQuery(
    eventsByOrganizerList(
      realmId,
      discoverableFilter,
      now,
      Number.MAX_SAFE_INTEGER,
      DEFAULT_EVENTS_LIMIT,
    ),
  );

  const {
    data: pastEventsPages,
    isFetchingNextPage: isFetchingPastNextPage,
    hasNextPage: hasNextPastPage,
    isFetching: isFetchingPast,
    fetchNextPage: fetchNextPastPage,
  } = useSuspenseInfiniteQuery(
    eventsByOrganizerList(
      realmId,
      discoverableFilter,
      now - 1,
      0,
      DEFAULT_EVENTS_LIMIT,
    ),
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
    <>
      <Heading level={2} size="lg">
        {t("hosting-events")} ({upcomingEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        <EventCardListLayout>
          {upcomingEvents.map((evt) => (
            <EventCard
              href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
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

      <Heading level={2} size="lg" className="mt-8">
        {t("past-events")} ({pastEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        <EventCardListLayout>
          {pastEvents.map((evt) => (
            <EventCard
              href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
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
    </>
  );
}
