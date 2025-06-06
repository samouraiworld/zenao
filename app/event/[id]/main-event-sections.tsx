"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import Link from "next/link";
import EventFeedForm from "./event-feed-form";
import { Separator } from "@/components/shadcn/separator";
import { cn } from "@/lib/tailwind";
import { TabsContent } from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { PollsList } from "@/components/widgets/polls-list";
import { PostsList } from "@/components/widgets/posts-list";
import { userAddressOptions } from "@/lib/queries/user";
import {
  EventInfoTabsSchemaType,
  FeedPostFormSchemaType,
} from "@/components/form/types";
import { eventOptions } from "@/lib/queries/event";
import { eventUserRoles } from "@/lib/queries/event-users";

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
  const t = useTranslations("event");

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
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
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto">
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

      <TabsContent value="description" className="overflow-hidden">
        <MarkdownPreview markdownString={data.description} />
      </TabsContent>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          {section !== "description" && isMember && (
            <EventFeedForm eventId={eventId} form={form} />
          )}
          {/* Social Feed (Discussions) */}
          <TabsContent value="feed">
            <PostsList eventId={eventId} userAddress={userAddress} />
          </TabsContent>
          {/* Social Feed (Votes) */}
          <TabsContent value="votes">
            <PollsList eventId={eventId} userAddress={userAddress} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
