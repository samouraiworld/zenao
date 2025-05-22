"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useForm, UseFormReturn } from "react-hook-form";
import {
  StandardPostForm,
  FeedInputMode,
} from "@/components/form/social-feed/standard-post-form";
import { PollPostForm } from "@/components/form/social-feed/poll-post-form";
import { userAddressOptions } from "@/lib/queries/user";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { PostsList } from "@/components/widgets/posts-list";
import { PollsList } from "@/components/widgets/polls-list";
import { derivePkgAddr } from "@/lib/gno";
import { GnowebButton } from "@/components/buttons/gnoweb-button";
import { FeedPostFormSchemaType } from "@/components/form/types";

const eventTabs = ["global-feed", "polls-feed"] as const;
export type EventTab = (typeof eventTabs)[number];

const EventFeedForm = ({
  eventId,
  form,
}: {
  eventId: string;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) => {
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");

  useEffect(() => {
    if (feedInputMode === "POLL") {
      form.setValue("kind", "POLL");
    } else {
      form.setValue("kind", "STANDARD_POST");
    }
  }, [feedInputMode, form]);

  return (
    <div className="flex justify-center w-full transition-all duration-300 bg-secondary/80">
      <div className="w-full">
        {feedInputMode === "POLL" ? (
          <PollPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            form={form}
          />
        ) : (
          <StandardPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            form={form}
          />
        )}
      </div>
    </div>
  );
};

export function EventFeed({
  eventId,
  isMember,
}: {
  eventId: string;
  isMember: boolean;
}) {
  const [tab, setTab] = useState<EventTab>("global-feed");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const t = useTranslations("event-feed");
  const feedSlug = `${derivePkgAddr(`gno.land/r/zenao/events/e${eventId}`)}:main`;

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      kind: "STANDARD_POST",
      content: "",
    },
  });

  return (
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

      <GnowebButton
        href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/social_feed:${feedSlug}`}
      />

      <div className="flex flex-col gap-6 min-h-0 pt-4">
        {isMember && <EventFeedForm eventId={eventId} form={form} />}
        {tab === "global-feed" ? (
          <PostsList eventId={eventId} userAddress={userAddress} form={form} />
        ) : (
          <PollsList eventId={eventId} userAddress={userAddress} form={form} />
        )}
      </div>
    </div>
  );
}
