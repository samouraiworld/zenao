"use client";

import { ClerkLoaded, ClerkLoading, SignedIn, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, fromUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import { Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import React, { useMemo } from "react";
import { Event, WithContext } from "schema-dts";
import { EventManagementMenu } from "./event-management-menu";
import { ParticipantsSection } from "./participants-section";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { GnowebButton } from "@/components/buttons/gnoweb-button";
import { GoTopButton } from "@/components/buttons/go-top-button";
import { Card } from "@/components/cards/Card";
import { UserAvatarWithName } from "@/components/common/user";
import { EventRegistrationForm } from "@/components/form/event-registration";
import { Web3Image } from "@/components/images/web3-image";
import { useEventPassword } from "@/components/providers/event-password-provider";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Separator } from "@/components/shadcn/separator";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import EventLocationSection from "@/components/widgets/event-location-section";
import { makeLocationFromEvent } from "@/lib/location";
import { eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { web2URL } from "@/lib/uris";
import { Skeleton } from "@/components/shadcn/skeleton";

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
  const { getToken, userId } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { password } = useEventPassword();
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));

  const location = makeLocationFromEvent(data.location);
  const timezone = useLocationTimezone(location);

  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isStarted = Date.now() > Number(data.startDate) * 1000;

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
            <ParticipantsSection id={eventId} />
          </EventSection>
        </div>
      </div>

      {/* Participate Card */}
      <ClerkLoading>
        <Skeleton className="w-full h-28" />
      </ClerkLoading>
      <ClerkLoaded>
        <Card className="mt-2">
          {isParticipant ? (
            <div>
              <div className="flex flex-row justify-between">
                <Heading level={2} size="xl">
                  {t("in")}
                </Heading>
                <SignedIn>
                  <Link
                    href={`/ticket/${eventId}`}
                    className="text-main underline"
                  >
                    {t("see-ticket")}
                  </Link>
                </SignedIn>
                {/* TODO: create a clean decount timer */}
                {/* <SmallText>{t("start", { count: 2 })}</SmallText> */}
              </div>
              {/* add back when we can cancel
                <Text className="my-4">{t("cancel-desc")}</Text>
              */}
            </div>
          ) : isStarted ? (
            <div>
              <Heading level={2} size="xl">
                {t("already-begun")}
              </Heading>
              <Text className="my-4">{t("too-late")}</Text>
            </div>
          ) : (
            <div>
              <Heading level={2} size="xl">
                {t("registration")}
              </Heading>
              <Text className="my-4">{t("join-desc")}</Text>
              <EventRegistrationForm
                eventId={eventId}
                userAddress={address}
                eventPassword={password}
              />
            </div>
          )}
        </Card>
      </ClerkLoaded>

      {children}

      <GoTopButton />
    </div>
  );
}
