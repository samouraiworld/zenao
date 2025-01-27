"use client";

import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { format, fromUnixTime } from "date-fns";
import { Calendar, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { ParticipateForm } from "./ParticipateForm";
import { eventOptions, eventUserParticipate } from "@/lib/queries/event";
import { Card } from "@/components/cards/Card";
import { Separator } from "@/components/common/Separator";
import { Text } from "@/components/texts/DefaultText";
import { SmallText } from "@/components/texts/SmallText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { LargeText } from "@/components/texts/LargeText";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";

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
  const { data: isParticipate } = useSuspenseQuery(
    eventUserParticipate(authToken, id),
  );

  const t = useTranslations("event");

  const iconSize = 22;

  if (!data) {
    return <p>{`Event doesn't exist`}</p>;
  }
  return (
    <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
      <div className="flex flex-col gap-4 w-full sm:w-2/5">
        <Image
          src={data.imageUri}
          width={330}
          height={330}
          alt="Event"
          priority
          className="flex w-full rounded-xl self-center"
        />

        {/* TODO: Uncomment that when edit event page exist */}
        {/* {isOrganisatorRole && ( */}
        {/*   <Card className="flex flex-row items-center"> */}
        {/*     <SmallText className="w-3/5">{t("is-organisator-role")}</SmallText> */}
        {/*     <div className="w-2/5 flex justify-end"> */}
        {/*       <Button variant="outline"> */}
        {/*         <SmallText>{t("manage-button")}</SmallText> */}
        {/*       </Button> */}
        {/*     </div> */}
        {/*   </Card> */}
        {/* )} */}
        <EventSection title={t("going", { count: data.participants })}>
          <Link
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/events/e${id}`}
          >
            <SmallText>See on Gnoweb</SmallText>
          </Link>
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
        <div className="flex flex-row gap-4 items-center">
          <MapPin width={iconSize} height={iconSize} />
          {/* TODO: Add location */}
          <LargeText>{data.location}</LargeText>
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
          ) : (
            <div>
              <LargeText>{t("registration")}</LargeText>
              <Text className="my-4">{t("join-desc")}</Text>
              <ParticipateForm eventId={id} />
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
