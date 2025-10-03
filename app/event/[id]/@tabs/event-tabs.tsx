"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSelectedLayoutSegment } from "next/navigation";
import EventFeedForm from "../../../../components/event-feed-form/event-feed-form";
import { Separator } from "@/components/shadcn/separator";
import { TabsContent } from "@/components/shadcn/tabs";
import { userAddressOptions } from "@/lib/queries/user";
import { eventUserRoles } from "@/lib/queries/event-users";
import {
  EventInfoTabsSchemaType,
  feedPostFormSchema,
  FeedPostFormSchemaType,
} from "@/types/schemas";

export function EventTabs({
  children,
  eventId,
}: {
  children?: React.ReactNode;
  eventId: string;
}) {
  const t = useTranslations("event");

  const section = useSelectedLayoutSegment() || "description";

  return (
    <Tabs value={section} className={"w-full min-h-screen"}>
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto">
        <Link href={`/event/${eventId}`} scroll={false}>
          <TabsTrigger
            value="description"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("about-event")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/feed`} scroll={false}>
          <TabsTrigger
            value="feed"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("discussion")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/votes`} scroll={false}>
          <TabsTrigger
            value="votes"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("votes")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          {!!eventId && !!section && (
            <MainEventSectionsContent
              eventId={eventId}
              section={section as unknown as "description" | "feed" | "votes"}
            >
              {children}
            </MainEventSectionsContent>
          )}
        </div>
      </div>
    </Tabs>
  );
}

function MainEventSectionsContent({
  eventId,
  section,
  children,
}: {
  eventId: string;
  section: EventInfoTabsSchemaType;
  children: React.ReactNode;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );

  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isMember = useMemo(
    () => isOrganizer || isParticipant,
    [isOrganizer, isParticipant],
  );
  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    resolver: zodResolver(feedPostFormSchema),
    defaultValues: {
      content: "",
      question: "",
      options: [{ text: "" }, { text: "" }],
      allowMultipleOptions: false,
      duration: {
        days: 1,
        hours: 0,
        minutes: 0,
      },
    },
  });

  return (
    <>
      {section !== "description" && isMember && (
        <EventFeedForm eventId={eventId} form={form} />
      )}
      <TabsContent value={section}>{children}</TabsContent>
    </>
  );
}
