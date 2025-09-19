"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import ProfileHeader from "./profile-header";
import { EventCard } from "@/components/features/event/event-card";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/widgets/texts/heading";
import { eventIdFromPkgPath } from "@/lib/queries/event";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerList,
  eventsUndiscoverablesByOrganizerList,
} from "@/lib/queries/events-list";
import { profileOptions } from "@/lib/queries/profile";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";

export function ProfileInfo({
  address,
  now,
}: {
  address: string;
  now: number;
}) {
  const t = useTranslations("profile-info");

  const { data: profile } = useSuspenseQuery(profileOptions(address));
  const {
    data: upcomingEventsPages,
    isFetchingNextPage: isFetchingUpcomingNextPage,
    hasNextPage: hasNextUpcomingPage,
    isFetching: isFetchingUpcoming,
    fetchNextPage: fetchNextUpcomingPage,
  } = useSuspenseInfiniteQuery(
    eventsByOrganizerList(
      address,
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
    eventsByOrganizerList(address, now - 1, 0, DEFAULT_EVENTS_LIMIT),
  );

  const {
    data: upcomingUndiscoverableEventsPages,
    isFetchingNextPage: isFetchingUpcomingUndiscoverableNextPage,
    hasNextPage: hasNextUpcomingUndiscoverablePage,
    isFetching: isFetchingUpcomingUndiscoverable,
    fetchNextPage: fetchNextUpcomingUndiscoverablePage,
  } = useSuspenseInfiniteQuery(
    eventsUndiscoverablesByOrganizerList(
      address,
      now,
      Number.MAX_SAFE_INTEGER,
      DEFAULT_EVENTS_LIMIT,
    ),
  );
  const {
    data: pastUndiscoverableEventsPages,
    isFetchingNextPage: isFetchingPastUndiscoverableNextPage,
    hasNextPage: hasNextPastUndiscoverablePage,
    isFetching: isFetchingPastUndiscoverable,
    fetchNextPage: fetchNextPastUndiscoverablePage,
  } = useSuspenseInfiniteQuery(
    eventsUndiscoverablesByOrganizerList(
      address,
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

  const upcomingUndiscoverableEvents = useMemo(
    () => upcomingUndiscoverableEventsPages.pages.flat(),
    [upcomingUndiscoverableEventsPages],
  );
  const pastUndiscoverableEvents = useMemo(
    () => pastUndiscoverableEventsPages.pages.flat(),
    [pastUndiscoverableEventsPages],
  );

  // profileOptions can return array of object with empty string (except address)
  // So to detect if a user doesn't exist we have to check if all strings are empty (except address)
  if (!profile?.bio && !profile?.displayName && !profile?.avatarUri) {
    return <p>{t("profile-not-exist")}</p>;
  }

  const jsonLd: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    alternateName: profile?.displayName,
    image: profile?.avatarUri,
    knowsAbout: profile?.bio,
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProfileHeader
          address={profile.address}
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUri={profile.avatarUri}
        />
      </div>

      <Separator />

      <Heading level={2} size="lg">
        {t("hosting-discoverable-events")} ({upcomingEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {/* ---- Discoverable events */}
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

      <Heading level={2} size="lg">
        {t("past-discoverable-events")} ({pastEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {/* ---- Discoverable events */}
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

      <Heading level={2} size="lg">
        {t("hosting-undiscoverable-events")} (
        {upcomingUndiscoverableEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {/* ---- Undiscoverable events */}
        <EventCardListLayout>
          {upcomingUndiscoverableEvents.map((evt) => (
            <EventCard
              href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
              key={evt.pkgPath}
              evt={evt}
            />
          ))}
        </EventCardListLayout>

        <LoaderMoreButton
          fetchNextPage={fetchNextUpcomingUndiscoverablePage}
          hasNextPage={hasNextUpcomingUndiscoverablePage}
          isFetching={isFetchingUpcomingUndiscoverable}
          isFetchingNextPage={isFetchingUpcomingUndiscoverableNextPage}
          page={upcomingUndiscoverableEvents}
          noMoreLabel=""
        />
      </div>

      <Heading level={2} size="lg">
        {t("past-undiscoverable-events")} ({pastUndiscoverableEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        {/* ---- Undiscoverable events */}
        <EventCardListLayout>
          {pastUndiscoverableEvents.map((evt) => (
            <EventCard
              href={`/event/${eventIdFromPkgPath(evt.pkgPath)}`}
              key={evt.pkgPath}
              evt={evt}
            />
          ))}
        </EventCardListLayout>

        <div className="mt-8">
          <LoaderMoreButton
            fetchNextPage={fetchNextPastUndiscoverablePage}
            hasNextPage={hasNextPastUndiscoverablePage}
            isFetching={isFetchingPastUndiscoverable}
            isFetchingNextPage={isFetchingPastUndiscoverableNextPage}
            page={pastUndiscoverableEvents}
            noMoreLabel=""
          />
        </div>
      </div>
    </div>
  );
}
