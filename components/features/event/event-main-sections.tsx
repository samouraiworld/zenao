"use client";

import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { Separator } from "@/components/shadcn/separator";
import { cn } from "@/lib/tailwind";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { userInfoOptions } from "@/lib/queries/user";
import { eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";
import {
  EventInfoTabsSchemaType,
  socialFeedPostFormSchema,
  SocialFeedPostFormSchemaType,
} from "@/types/schemas";
import EventFeed from "@/app/event/[id]/(general)/[tab]/feed";
import EventPolls from "@/app/event/[id]/(general)/[tab]/votes";
import SocialFeedForm from "@/components/social-feed/forms/social-feed-form";

export function MainEventSections({
  className,
  eventId,
  section,
}: {
  eventId: string;
  section: EventInfoTabsSchemaType;
  className?: string;
}) {
  const { getToken, userId } = useAuth();
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userRealmId),
  );

  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);
  const isMember = useMemo(
    () => isOrganizer || isParticipant,
    [isOrganizer, isParticipant],
  );
  const t = useTranslations("event");

  const form = useForm<SocialFeedPostFormSchemaType>({
    mode: "all",
    resolver: zodResolver(socialFeedPostFormSchema),
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
    <Tabs value={section} className={cn("w-full", className)}>
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/event/${eventId}`}>
          <TabsTrigger
            value="description"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("about-event")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/feed`}>
          <TabsTrigger
            value="feed"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("discussion")}
          </TabsTrigger>
        </Link>
        <Link href={`/event/${eventId}/votes`}>
          <TabsTrigger
            value="votes"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("votes")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />

      <TabsContent
        value="description"
        className="min-h-1/2 overflow-x-hidden h-fit"
      >
        <MarkdownPreview markdownString={data.description} />
      </TabsContent>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          {section !== "description" && isMember && (
            <SocialFeedForm orgType="event" orgId={eventId} form={form} />
          )}
          {/* Social Feed (Discussions) */}
          <TabsContent value="feed">
            <EventFeed eventId={eventId} />
          </TabsContent>
          {/* Social Feed (Votes) */}
          <TabsContent value="votes">
            <EventPolls eventId={eventId} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
