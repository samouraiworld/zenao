"use client";

import React, { useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format as formatTZ } from "date-fns-tz";
import { format, fromUnixTime } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Event, WithContext } from "schema-dts";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { TZDate } from "react-day-picker";
import { ParticipateForm } from "./participate-form";
import { ParticipantsSection } from "./participants-section";
import { eventOptions } from "@/lib/queries/event";
import { Card } from "@/components/cards/Card";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { eventUserRoles } from "@/lib/queries/event-users";
import { Separator } from "@/components/shadcn/separator";
import MapCaller from "@/components/common/map/map-lazy-components";
import { userAddressOptions } from "@/lib/queries/user";
import { web2URL } from "@/lib/uris";
import { UserAvatarWithName } from "@/components/common/user";
import Text from "@/components/texts/text";
import Heading from "@/components/texts/heading";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";
import { makeLocationFromEvent } from "@/lib/location";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/images/web3-image";

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

export function EventInfo({ id }: { id: string }) {
  const { getToken, userId } = useAuth();
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(id, address));

  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isStarted = Date.now() > Number(data.startDate) * 1000;

  // Correctly reconstruct location object
  const location = makeLocationFromEvent(data.location);
  const timezone = useLocationTimezone(location);

  const t = useTranslations("event");
  const [loading, setLoading] = React.useState<boolean>(false);

  const jsonLd: WithContext<Event> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: data.title,
    description: data.description,
    startDate: new TZDate(
      Number(data.startDate) * 1000,
      timezone,
    ).toISOString(),
    endDate: new TZDate(Number(data.endDate) * 1000, timezone).toISOString(),
    location:
      location.kind === "virtual" ? location.location : location.address,
    maximumAttendeeCapacity: data.capacity,
    image: web2URL(data.imageUri),
  };

  const iconSize = 22;

  if (!data) {
    return <p>{`Event doesn't exist`}</p>;
  }
  return (
    <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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
            className="flex w-full rounded-xl self-center object-cover"
          />
        </AspectRatio>
        {/* If the user is organizer, link to /edit page */}
        {isOrganizer && (
          <Card className="flex flex-row items-center">
            <Text className="w-3/5">{t("is-organisator-role")}</Text>
            <div className="w-2/5 flex justify-end">
              <Link href={`/edit/${id}`}>
                <ButtonWithLabel
                  label={t("edit-button")}
                  onClick={() => setLoading(true)}
                  loading={loading}
                />
              </Link>
            </div>
          </Card>
        )}

        {/* Participants preview and dialog section */}
        <EventSection title={t("going", { count: data.participants })}>
          <ParticipantsSection id={id} />
        </EventSection>

        {/* Host section */}
        <EventSection title={t("hosted-by")}>
          <UserAvatarWithName linkToProfile address={data.creator} />
        </EventSection>
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
        <div className="flex flex-col">
          <div className="flex flex-row gap-4 items-center mb-2">
            <div className="w-[22px] h-[22px]">
              <MapPin width={iconSize} height={iconSize} />
            </div>
            {location.kind === "virtual" ? (
              <Link href={location.location} target="_blank">
                <Heading
                  level={2}
                  size="xl"
                  className="hover:underline hover:underline-offset-1"
                >
                  {location.location}
                </Heading>
              </Link>
            ) : (
              <Heading level={2} size="xl">
                {location.address}
              </Heading>
            )}
          </div>
          {location.kind === "geo" && (
            <MapCaller lat={location.lat} lng={location.lng} />
          )}
        </div>

        {/* Participate Card */}
        <Card className="mt-2">
          {isParticipant ? (
            <div>
              <div className="flex flex-row justify-between">
                <Heading level={2} size="xl">
                  {t("in")}
                </Heading>
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
              <ParticipateForm
                eventId={id}
                userId={userId}
                userAddress={address}
              />
            </div>
          )}
        </Card>

        {/* Markdown Description */}
        <EventSection title={t("about-event")}>
          <MarkdownPreview markdownString={data.description} />
        </EventSection>
      </div>
    </div>
  );
}
