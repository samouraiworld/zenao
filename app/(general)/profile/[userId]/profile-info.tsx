"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Person, WithContext } from "schema-dts";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import ProfileHeader from "./profile-header";
import { EventCard } from "@/components/features/event/event-card";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/widgets/texts/heading";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerList,
} from "@/lib/queries/events-list";
import { profileOptions } from "@/lib/queries/profile";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";
import { userInfoOptions } from "@/lib/queries/user";
import { profileDetailsSchema } from "@/types/schemas";
import { deserializeWithFrontMatter } from "@/lib/serialization";

export function ProfileInfo({
  userId: profileUserId,
  now,
}: {
  userId: string;
  now: number;
}) {
  const t = useTranslations("profile-info");
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const isOwner = userInfo?.userId === profileUserId;
  // The connected user can see his both discoverable and undiscoverable events
  const discoverableFilter = isOwner
    ? DiscoverableFilter.UNSPECIFIED
    : DiscoverableFilter.DISCOVERABLE;

  const { data: profile } = useSuspenseQuery(profileOptions(profileUserId));
  const {
    data: upcomingEventsPages,
    isFetchingNextPage: isFetchingUpcomingNextPage,
    hasNextPage: hasNextUpcomingPage,
    isFetching: isFetchingUpcoming,
    fetchNextPage: fetchNextUpcomingPage,
  } = useSuspenseInfiniteQuery(
    eventsByOrganizerList(
      profileUserId,
      discoverableFilter,
      now,
      Number.MAX_SAFE_INTEGER,
      DEFAULT_EVENTS_LIMIT,
      getToken,
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
      profileUserId,
      discoverableFilter,
      now - 1,
      0,
      DEFAULT_EVENTS_LIMIT,
      getToken,
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

  // profileOptions can return array of object with empty string (except address)
  // So to detect if a user doesn't exist we have to check if all strings are empty (except address)
  if (!profile?.bio && !profile?.displayName && !profile?.avatarUri) {
    return <p>{t("profile-not-exist")}</p>;
  }

  const profileDetails = deserializeWithFrontMatter({
    serialized: profile.bio,
    schema: profileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
      experiences: [],
      skills: [],
    },
    contentFieldName: "bio",
  });

  const jsonLd: WithContext<Person> = {
    "@context": "https://schema.org",
    "@type": "Person",
    alternateName: profile?.displayName,
    image: profile?.avatarUri,
    knowsAbout: profileDetails?.bio,
  };

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ProfileHeader
          userId={profileUserId}
          displayName={profile.displayName}
          bio={profile.bio}
          avatarUri={profile.avatarUri}
        />
      </div>

      <Separator />

      <Heading level={2} size="lg">
        {t("hosting-events")} ({upcomingEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        <EventCardListLayout>
          {upcomingEvents.map((evt) => (
            <EventCard href={`/event/${evt.id}`} key={evt.id} evt={evt} />
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
        {t("past-events")} ({pastEvents.length})
      </Heading>

      <div className="flex flex-col gap-0">
        <EventCardListLayout>
          {pastEvents.map((evt) => (
            <EventCard href={`/event/${evt.id}`} key={evt.id} evt={evt} />
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
