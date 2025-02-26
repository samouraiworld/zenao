"use client";

import React, { useCallback } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { format, fromUnixTime } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import { Event, WithContext } from "schema-dts";
import Link from "next/link";
import L from "leaflet";
import { ParticipateForm } from "./ParticipateForm";
import { imageWidth } from "./constants";
import { eventOptions } from "@/lib/queries/event";
import { Card } from "@/components/cards/Card";
import { Separator } from "@/components/common/Separator";
import { Text } from "@/components/texts/DefaultText";
import { SmallText } from "@/components/texts/SmallText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { LargeText } from "@/components/texts/LargeText";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { eventUserRoles } from "@/lib/queries/event-user-roles";
import "leaflet/dist/leaflet.css";
import { Map } from "@/components/common/Map";
import { EventFormSchemaType } from "@/components/form/types";
import { web3ImgLoader } from "@/lib/web3-img-loader";

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

export function EventInfo({
  id,
  authToken,
}: {
  id: string;
  authToken: string | null;
}) {
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: roles } = useSuspenseQuery(eventUserRoles(authToken, id));
  const isOrganizer = roles.includes("organizer");
  const isParticipate = roles.includes("participant");
  const isStarted = Date.now() > Number(data.startDate) * 1000;
  const queryClient = useQueryClient();

  // Correctly reconstruct location object
  let location: EventFormSchemaType["location"] = {
    kind: "custom",
    address: "",
    timeZone: "",
  };
  switch (data.location?.address.case) {
    case "custom":
      location = {
        kind: "custom",
        address: data.location?.address.value.address,
        timeZone: data.location?.address.value.timezone,
      };
      break;
    case "geo":
      location = {
        kind: "geo",
        address: data.location?.address.value.address,
        lat: data.location?.address.value.lat,
        lng: data.location?.address.value.lng,
        size: data.location?.address.value.size,
      };
      break;
    case "virtual":
      location = {
        kind: "virtual",
        location: data.location?.address.value.uri,
      };
  }

  const t = useTranslations("event");
  const [loading, setLoading] = React.useState<boolean>(false);

  const handleParticipateSuccess = useCallback(async () => {
    const opts = eventUserRoles(authToken, id);
    await queryClient.cancelQueries(opts);
    queryClient.setQueryData(opts.queryKey, (roles) => {
      if (!roles) {
        return ["participant" as const];
      }
      if (!roles.includes("participant")) {
        return [...roles, "participant" as const];
      }
      return roles;
    });
  }, [queryClient, authToken, id]);

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
    image: data.imageUri,
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

      <div className="flex flex-col gap-4 w-full sm:w-2/5">
        <Image
          src={data.imageUri}
          width={imageWidth}
          height={330}
          alt="Event"
          priority
          className="flex w-full rounded-xl self-center"
          loader={web3ImgLoader}
        />
        {isOrganizer && (
          <Card className="flex flex-row items-center">
            <SmallText className="w-3/5">{t("is-organisator-role")}</SmallText>
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
        <EventSection title={t("going", { count: data.participants })}>
          <a
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/events/e${id}`}
            target="_blank"
          >
            <SmallText>See on Gnoweb</SmallText>
          </a>
        </EventSection>
        {/* TODO: Uncomment that when we can see the name of the addr */}
        {/* <EventSection title={t("hosted-by")}> */}
        {/*   <SmallText>User</SmallText> */}
        {/* </EventSection> */}
      </div>
      <div className="flex flex-col gap-4 w-full sm:w-3/5">
        <VeryLargeText className="mb-7">{data.title}</VeryLargeText>
        <div className="flex flex-row gap-4 items-center">
          <Calendar width={iconSize} height={iconSize} />
          <div className="flex flex-col">
            <LargeText>
              {format(fromUnixTime(Number(data.startDate)), "PPP")}
            </LargeText>
            <div className="flex flex-row text-sm gap-1">
              <SmallText variant="secondary">
                {format(fromUnixTime(Number(data.startDate)), "p")}
              </SmallText>
              <SmallText variant="secondary">-</SmallText>
              <SmallText variant="secondary">
                {format(fromUnixTime(Number(data.endDate)), "PPp")}
              </SmallText>
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="flex flex-row gap-4 items-center mb-2">
            <div className="w-[22px] h-[22px]">
              <MapPin width={iconSize} height={iconSize} />
            </div>
            <LargeText>
              {location.kind === "virtual"
                ? location.location
                : location.address}
            </LargeText>
          </div>
          {location.kind === "geo" && (
            <Map marker={new L.LatLng(location.lat, location.lng)} />
          )}
        </div>

        <Card className="mt-2">
          {isParticipate ? (
            <div>
              <div className="flex flex-row justify-between">
                <LargeText>{t("in")}</LargeText>
                {/* TODO: create a clean decount timer */}
                {/* <SmallText>{t("start", { count: 2 })}</SmallText> */}
              </div>
              {/* add back when we can cancel
                <Text className="my-4">{t("cancel-desc")}</Text>
              */}
            </div>
          ) : isStarted ? (
            <div>
              <LargeText>{t("already-begun")}</LargeText>
              <Text className="my-4">{t("too-late")}</Text>
            </div>
          ) : (
            <div>
              <LargeText>{t("registration")}</LargeText>
              <Text className="my-4">{t("join-desc")}</Text>
              <ParticipateForm
                onSuccess={handleParticipateSuccess}
                eventId={id}
              />
            </div>
          )}
        </Card>
        <EventSection title={t("about-event")}>
          <MarkdownPreview markdownString={data.description} />
        </EventSection>
      </div>
    </div>
  );
}
