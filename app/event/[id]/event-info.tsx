"use client";

import React, { useMemo, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format as formatTZ } from "date-fns-tz";
import { format, fromUnixTime } from "date-fns";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { SignedIn, useAuth } from "@clerk/nextjs";
import { Event, WithContext } from "schema-dts";
import { ParticipantsSection } from "./participants-section";
import { EventManagementMenu } from "./event-management-menu";
import { eventOptions } from "@/lib/queries/event";
import { Card } from "@/components/cards/Card";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { EventFeed } from "@/app/event/[id]/event-feed";
import { cn } from "@/lib/tailwind";
import { useIsLinesTruncated } from "@/app/hooks/use-is-lines-truncated";
import { web2URL } from "@/lib/uris";
import { UserAvatarWithName } from "@/components/common/user";
import Text from "@/components/texts/text";
import Heading from "@/components/texts/heading";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/images/web3-image";
import { GoTopButton } from "@/components/buttons/go-top-button";
import { Separator } from "@/components/shadcn/separator";
import { EventRegistrationForm } from "@/components/form/event-registration";
import { makeLocationFromEvent } from "@/lib/location";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { useEventPassword } from "@/components/providers/event-password-provider";
import EventLocationSection from "@/components/widgets/event-location-section";

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

export function EventInfo({ eventId }: { eventId: string }) {
  const { getToken, userId } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { password } = useEventPassword();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));

  const location = makeLocationFromEvent(data.location);
  const timezone = useLocationTimezone(location);

  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isStarted = Date.now() > Number(data.startDate) * 1000;

  const t = useTranslations("event");

  const [isDescExpanded, setDescExpanded] = useState(false);

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

  const descLineClamp = 8;
  const descLineClampClassName = "line-clamp-[8]"; // Dynamic "8" value doesn't work here and inline style with WebkitLineClamp neither
  const descContainerRef = useRef<HTMLDivElement>(null);
  const isDescTruncated = useIsLinesTruncated(descContainerRef, descLineClamp);
  const iconSize = 22;

  return (
    <div className="flex flex-col w-full sm:h-full gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="flex flex-col w-full sm:flex-row sm:h-full gap-10">
        {/* Left Section */}
        <div className="flex flex-col gap-4 w-full sm:w-2/5">
          <AspectRatio ratio={1 / 1}>
            <Web3Image
              src={data.imageUri}
              sizes="(max-width: 768px) 100vw,
            (max-width: 1200px) 50vw,
            33vw"
              fill
              alt="Event"
              priority
              fetchPriority="high"
              className="flex w-full rounded-xl self-center object-cover"
            />
          </AspectRatio>

          {/* Participants preview and dialog section */}
          <EventSection
            title={
              data.participants === 0
                ? t("nobody-going-yet")
                : t("going", { count: data.participants })
            }
          >
            <ParticipantsSection id={eventId} />
          </EventSection>

          {/* Host section */}
          <EventSection title={t("hosted-by")}>
            <UserAvatarWithName linkToProfile address={data.creator} />
          </EventSection>

          <EventManagementMenu
            eventId={eventId}
            roles={roles}
            nbParticipants={data.participants}
          />
        </div>

        {/* Right Section */}
        <div className="flex flex-col gap-4 w-full sm:w-3/5">
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

          {/* Participate Card */}
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

          {/* Markdown Description */}
          <EventSection title={t("about-event")}>
            <div ref={descContainerRef}>
              <MarkdownPreview
                className={cn(
                  "overflow-hidden text-ellipsis",
                  !isDescExpanded && descLineClampClassName,
                )}
                markdownString={data.description}
              />
            </div>

            {/* See More button */}
            {isDescTruncated && (
              <div
                className="w-full flex justify-center cursor-pointer "
                onClick={() =>
                  setDescExpanded((isDescExpanded) => !isDescExpanded)
                }
              >
                {isDescExpanded ? <ChevronUp /> : <ChevronDown />}
              </div>
            )}
          </EventSection>
        </div>
      </div>

      {/* Social Feed */}
      <EventFeed eventId={eventId} isMember={isParticipant || isOrganizer} />
      <GoTopButton />
    </div>
  );
}
