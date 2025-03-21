"use client";

import React, { ReactNode, useCallback, useRef, useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { format, fromUnixTime } from "date-fns";
import { Calendar, ChevronDownIcon, ChevronUpIcon, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Event, WithContext } from "schema-dts";
import { ParticipateForm } from "./ParticipateForm";
import { ParticipantsSection } from "./participants-section";
import { eventOptions } from "@/lib/queries/event";
import { Card } from "@/components/cards/Card";
import { MarkdownPreview } from "@/components/common/MarkdownPreview";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { eventUserRoles } from "@/lib/queries/event-users";
import { Separator } from "@/components/shadcn/separator";
import { web3ImgLoader } from "@/lib/web3-img-loader";
import { EventFormSchemaType } from "@/components/form/types";
import MapCaller from "@/components/common/map/MapLazyComponents";
import { userAddressOptions } from "@/lib/queries/user";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { EventFeed } from "@/app/event/[id]/event-feed";
import { cn } from "@/lib/tailwind";
import { useIsLinesTruncated } from "@/app/hooks/use-is-lines-truncated";
import { web2URL } from "@/lib/uris";
import { UserAvatarWithName } from "@/components/common/user";
import Text from "@/components/texts/text";
import Heading from "@/components/texts/heading";
import { imageHeight, imageWidth } from "@/app/event/[id]/constants";
import { feedPosts } from "@/lib/queries/social-feed";
import { PostsList } from "@/components/lists/posts-list";
import { fakePollPosts, fakeStandardPosts } from "@/lib/social-feed";
import { PollsList } from "@/components/lists/polls-list";

function EventSection({
  title,
  children,
  className,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Text className="font-semibold">{title}</Text>
      <Separator className="mt-2 mb-3" />
      {children && children}
    </div>
  );
}

const eventTabs = ["global-feed", "polls-feed"] as const;
export type EventTab = (typeof eventTabs)[number];

export function EventInfo({ id }: { id: string }) {
  const { getToken, userId } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(id, address));

  const isOrganizer = roles.includes("organizer");
  const isParticipate = roles.includes("participant");
  const isStarted = Date.now() > Number(data.startDate) * 1000;
  const queryClient = useQueryClient();

  // TODO: Exploit fetched posts from here
  const { data: posts } = useSuspenseQuery(
    // TODO: Handle offset and limit to make an infinite scroll

    feedPosts(id, 0, 100, "", address || ""),
  );

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
  const [loading, setLoading] = useState<boolean>(false);
  const [isDescExpanded, setDescExpanded] = useState(false);
  const [tab, setTab] = useState<EventTab>("global-feed");

  const handleParticipateSuccess = useCallback(async () => {
    const opts = eventUserRoles(id, address);
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
  }, [queryClient, id, address]);

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

  if (!data) {
    return <p>{`Event doesn't exist`}</p>;
  }
  return (
    <div className="flex flex-col w-full sm:h-full gap-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
        {/* Left Section */}
        <div className="flex flex-col gap-4 w-full sm:w-2/5">
          <Image
            src={data.imageUri}
            width={imageWidth}
            height={imageHeight}
            alt="Event"
            priority
            className="flex w-full rounded-xl self-center"
            loader={web3ImgLoader}
          />
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

          {/* ---- Participants preview and dialog section */}
          <EventSection title={t("going", { count: data.participants })}>
            <ParticipantsSection id={id} />
          </EventSection>

          {/* ---- Host section */}
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
                  {format(fromUnixTime(Number(data.endDate)), "PPp")}
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
            {isParticipate ? (
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
                  onSuccess={handleParticipateSuccess}
                  eventId={id}
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
                {isDescExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </div>
            )}
          </EventSection>
        </div>
      </div>

      {/* Tabs */}
      {/*TODO: Make these tabs pretty and cute uwu */}

      <div className="flex flex-col gap-4">
        <Tabs value={tab} onValueChange={(value) => setTab(value as EventTab)}>
          <TabsList className={`grid w-full grid-cols-${eventTabs.length}`}>
            {Object.values(eventTabs).map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {t(tab)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Social Feed */}
        <EventFeed isDescExpanded={isDescExpanded} posts={posts}>
          <>
            {/*TODO: Show list depending on tab*/}
            <PostsList list={fakeStandardPosts} />
            <PollsList list={fakePollPosts} />
          </>
        </EventFeed>
      </div>
    </div>
  );
}
