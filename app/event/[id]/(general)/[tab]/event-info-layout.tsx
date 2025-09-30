"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { format, fromUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { Suspense } from "react";
import { Event, WithContext } from "schema-dts";
import { EventManagementMenu } from "./event-management-menu";
import { ParticipantsSection } from "./event-participants-section";
import { useLocationTimezone } from "@/hooks/use-location-timezone";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { GoTopButton } from "@/components/widgets/buttons/go-top-button";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { useEventPassword } from "@/components/providers/event-password-provider";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { makeLocationFromEvent } from "@/lib/location";
import { eventOptions } from "@/lib/queries/event";
import { web2URL } from "@/lib/uris";
import {
  UserAvatarWithName,
  UserAvatarWithNameSkeleton,
} from "@/components/features/user/user";
import EventParticipationInfo from "@/components/features/event/event-participation-info";
import { Skeleton } from "@/components/shadcn/skeleton";
import {
  EventLocationSection,
  EventLocationSkeleton,
} from "@/components/features/event/event-location-section";

interface EventSectionProps {
  title: string;
  children?: React.ReactNode;
}

const EventSection: React.FC<EventSectionProps> = ({ title, children }) => {
  return (
    <div className="flex flex-col">
      <Text className="font-semibold">{title}</Text>
      <Separator className="mt-2 mb-3" />
      {children && children}
    </div>
  );
};

const iconSize = 22;

export function EventInfoLayout({
  eventId,
  children,
}: {
  eventId: string;
  children: React.ReactNode;
}) {
  const { password } = useEventPassword();
  const { data } = useSuspenseQuery(eventOptions(eventId));

  const location = makeLocationFromEvent(data.location);
  const timezone = useLocationTimezone(location);

  const t = useTranslations("event");

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
          <AspectRatio ratio={16 / 9}>
            <Web3Image
              src={data.imageUri}
              sizes="(max-width: 768px) 100vw,
              (max-width: 1200px) 50vw,
              33vw"
              fill
              alt="Event"
              priority
              fetchPriority="high"
              className="flex w-full rounded self-center object-cover"
            />
          </AspectRatio>
        </div>
        {/* Right Section */}
        <div className="flex flex-col gap-4 w-full sm:w-3/6">
          <Heading level={1} size="4xl" className="mb-7">
            {data.title}
          </Heading>
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <Heading level={2} size="xl">
                {format(fromUnixTime(Number(data.startDate)), "PPP")}
              </Heading>
              <div className="flex flex-row text-sm gap-1">
                <Text variant="secondary" size="sm">
                  {format(fromUnixTime(Number(data.startDate)), "p")}
                </Text>
                <Text variant="secondary" size="sm">
                  -
                </Text>
                <Text variant="secondary" size="sm">
                  {formatTZ(fromUnixTime(Number(data.endDate)), "PPp O", {
                    timeZone: timezone,
                  })}
                </Text>
              </div>
            </div>
          </div>

          {/* Location */}
          <EventLocationSection location={location} />

          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/events/e${eventId}`}
          />
          <Suspense fallback={<Text>TODO</Text>}>
            <EventManagementMenu
              eventId={eventId}
              nbParticipants={data.participants}
            />
          </Suspense>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-10">
        {/* Host section */}
        <div className="col-span-6 sm:col-span-3">
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithName linkToProfile address={data.organizers[0]} />
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
            <Suspense fallback={<Text>TODO</Text>}>
              <ParticipantsSection id={eventId} />
            </Suspense>
          </EventSection>
        </div>
      </div>

      {/* Participate Card */}
      <Suspense fallback={<Text>TODO</Text>}>
        <EventParticipationInfo
          eventId={eventId}
          eventData={data}
          password={password}
        />
      </Suspense>

      {children}

      <GoTopButton />
    </div>
  );
}

export function EventInfoLayoutSkeleton() {
  const t = useTranslations("event");

  return (
    <div className="flex flex-col w-full sm:h-full gap-8">
      <div className="flex flex-col w-full sm:flex-row sm:h-full gap-10">
        <div className="flex flex-col w-full sm:w-3/6">
          <AspectRatio ratio={16 / 9}>
            <Skeleton style={{ width: "100%", height: "100%" }} />
          </AspectRatio>
        </div>

        {/* Right Section */}
        <div className="flex flex-col gap-4 w-full sm:w-3/6">
          <Skeleton className="h-[2.5rem] w-60 mb-7" />
          <div className="flex flex-row gap-4 items-center">
            <Calendar width={iconSize} height={iconSize} />
            <div className="flex flex-col">
              <Skeleton className="h-[1.25rem] my-[0.25rem] w-40" />
              <div className="flex flex-row text-sm gap-1">
                <Skeleton className="h-[0.875rem] my-[0.1875rem] w-20" />
                <Text variant="secondary" size="sm">
                  -
                </Text>
                <Skeleton className="h-[0.875rem] my-[0.1875rem] w-40" />
              </div>
            </div>
          </div>

          {/* Location */}
          <EventLocationSkeleton />

          <GnowebButton href={""} />
        </div>
      </div>

      <div className="grid grid-cols-6 gap-10">
        {/* Host section */}
        <div className="col-span-6 sm:col-span-3">
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithNameSkeleton />
          </EventSection>
        </div>

        {/* Participants preview and dialog section */}
        <div className="col-span-6 sm:col-span-3"></div>
      </div>
    </div>
  );
}
