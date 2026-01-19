"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { fromUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import { Calendar, Banknote } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { Suspense, useMemo } from "react";
import { Event, WithContext } from "schema-dts";
import dynamic from "next/dynamic";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { makeLocationFromEvent } from "@/lib/location";
import { web2URL } from "@/lib/uris";
import { UserAvatarWithName } from "@/components/features/user/user";
import { EventImage } from "@/components/features/event/event-image";
import { locationTimezone } from "@/lib/event-location";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import {
  communitiesListByEvent,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import EventCommunitySection from "@/components/features/event/event-community-section";
import { Skeleton } from "@/components/shadcn/skeleton";
import { GoTopButton } from "@/components/widgets/buttons/go-top-button";
import EventLocationSection from "@/components/features/event/event-location-section";
import { ParticipantsSection } from "@/components/features/event/event-participants-section";
import { EventSection } from "@/components/features/event/event-section";
import { SafeEventInfo } from "@/types/schemas";
import { usePriceLabel } from "@/components/widgets/price-label";

const EventParticipationInfo = dynamic(
  () => import("@/components/features/event/event-participation-info"),
  { ssr: false },
);

const iconSize = 22;

export function EventInfoLayout({
  eventId,
  data,
}: {
  eventId: string;
  data: SafeEventInfo;
}) {
  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId = communities.length > 0 ? communities[0].id : null;

  const location = makeLocationFromEvent(data.location);
  const eventTimezone = locationTimezone(location);
  const timezone = useLayoutTimezone(eventTimezone);

  const t = useTranslations("event");
  const priceLabel = usePriceLabel(data.pricesGroups);

  const jsonLd: WithContext<Event> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.title,
    description: data.description,
    startDate: new Date(Number(data.startDate) * 1000).toISOString(),
    endDate: new Date(Number(data.endDate) * 1000).toISOString(),
    location:
      location.kind === "virtual" ? location.location : location.address,
    maximumAttendeeCapacity: data.capacity,
    image: web2URL(data.imageUri),
  };

  return (
    <div className="flex flex-col w-full sm:h-full gap-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col w-full sm:flex-row sm:h-full gap-10">
        <div className="flex flex-col w-full sm:w-3/6">
          <EventImage
            src={data.imageUri}
            sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"
            fill
            alt="Event"
            priority
            fetchPriority="high"
          />
        </div>
        {/* Right Section */}
        <div className="flex flex-col gap-4 w-full sm:w-3/6">
          <Heading level={1} size="4xl" className="mb-7">
            {data.title}
          </Heading>
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <Heading level={2} size="xl" suppressHydrationWarning>
                {formatTZ(fromUnixTime(Number(data.startDate)), "PPP", {
                  timeZone: timezone,
                })}
              </Heading>
              <div
                className="flex flex-row text-sm gap-1"
                suppressHydrationWarning
              >
                <Text variant="secondary" size="sm">
                  {formatTZ(fromUnixTime(Number(data.startDate)), "p", {
                    timeZone: timezone,
                  })}
                </Text>
                <Text variant="secondary" size="sm">
                  -
                </Text>
                <Text variant="secondary" size="sm" suppressHydrationWarning>
                  {formatTZ(fromUnixTime(Number(data.endDate)), "PPp O", {
                    timeZone: timezone,
                  })}
                </Text>
              </div>
            </div>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <Banknote width={iconSize} height={iconSize} />
            <Heading level={3} size="lg">
              {priceLabel}
            </Heading>
          </div>

          {/* Location */}
          <EventLocationSection location={location} />

          {/* Community */}
          {communityId && <EventCommunitySection communityId={communityId} />}
        </div>
      </div>

      <div className="grid grid-cols-6 gap-10">
        {/* Host section */}
        <div className="col-span-6 sm:col-span-3">
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithName linkToProfile userId={data.organizers[0]} />
          </EventSection>
        </div>

        {/* Participants preview and dialog section */}
        <div className="col-span-6 sm:col-span-3">
          <EventSection
            title={
              data.participants === 0
                ? t("nobody-going-yet")
                : t("going", { count: data.participants })
            }
          >
            <Suspense>
              <ParticipantsSection id={eventId} />
            </Suspense>
          </EventSection>
        </div>
      </div>

      {/* Participate Card */}
      <Suspense fallback={<Skeleton className="h-28 w-full rounded-md" />}>
        <EventParticipationInfo eventId={eventId} eventData={data} />
      </Suspense>

      <GoTopButton />
    </div>
  );
}
