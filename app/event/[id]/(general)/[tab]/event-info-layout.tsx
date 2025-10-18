"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { fromUnixTime } from "date-fns";
import { Calendar } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import React from "react";
import { Event, WithContext } from "schema-dts";
import { EventManagementMenu } from "./event-management-menu";
import { ParticipantsSection } from "./event-participants-section";
import { useLocationTimezone } from "@/hooks/use-location-timezone";
import { GnowebButton } from "@/components/widgets/buttons/gnoweb-button";
import { GoTopButton } from "@/components/widgets/buttons/go-top-button";
import { useEventPassword } from "@/components/providers/event-password-provider";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import EventLocationSection from "@/components/features/event/event-location-section";
import { makeLocationFromEvent } from "@/lib/location";
import { eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userInfoOptions } from "@/lib/queries/user";
import { web2URL } from "@/lib/uris";
import { UserAvatarWithName } from "@/components/features/user/user";
import EventParticipationInfo from "@/components/features/event/event-participation-info";
import { EventImage } from "@/components/features/event/event-image";

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

export function EventInfoLayout({
  eventId,
  children,
}: {
  eventId: string;
  children: React.ReactNode;
}) {
  const format = useFormatter();
  const { getToken, userId } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { password } = useEventPassword();
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userInfo?.realmId),
  );

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

  const iconSize = 22;

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
              <Heading level={2} size="xl">
                {format.dateTime(fromUnixTime(Number(data.startDate)), {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                  timeZone: timezone,
                })}
              </Heading>
              <div className="flex flex-row text-sm gap-1">
                <Text variant="secondary" size="sm">
                  {format.dateTime(fromUnixTime(Number(data.startDate)), {
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: timezone,
                  })}
                </Text>
                <Text variant="secondary" size="sm">
                  -
                </Text>
                <Text variant="secondary" size="sm">
                  {format.dateTime(fromUnixTime(Number(data.endDate)), {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZoneName: "short",
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
          <EventManagementMenu
            eventId={eventId}
            roles={roles}
            nbParticipants={data.participants}
          />
        </div>
      </div>

      <div className="grid grid-cols-6 gap-10">
        {/* Host section */}
        <div className="col-span-6 sm:col-span-3">
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithName linkToProfile realmId={data.organizers[0]} />
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
            <ParticipantsSection id={eventId} />
          </EventSection>
        </div>
      </div>

      {/* Participate Card */}
      <EventParticipationInfo
        eventId={eventId}
        eventData={data}
        roles={roles}
        password={password}
      />

      {children}

      <GoTopButton />
    </div>
  );
}
