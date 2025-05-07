"use client";

import React, { forwardRef, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/tailwind";
import {
  screenContainerMarginHorizontal,
  screenContainerMaxWidth,
} from "@/components/layout/ScreenContainer";
import {
  StandardPostForm,
  FeedInputMode,
} from "@/components/form/social-feed/standard-post-form";
import { PollPostForm } from "@/components/form/social-feed/poll-post-form";
import { userAddressOptions } from "@/lib/queries/user";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { PostsList } from "@/components/widgets/posts-list";
import { PollsList } from "@/components/widgets/polls-list";
import { mergeRefs } from "@/lib/utils";
import { derivePkgAddr } from "@/lib/gno";
import { GnowebButton } from "@/components/buttons/gnoweb-button";

const eventTabs = ["global-feed", "polls-feed"] as const;
export type EventTab = (typeof eventTabs)[number];

const EventFeedForm = forwardRef<
  HTMLDivElement,
  {
    eventId: string;
  }
>(({ eventId }, ref) => {
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");
  const feedMaxWidth =
    screenContainerMaxWidth - screenContainerMarginHorizontal * 2;

  return (
    <div
      ref={mergeRefs(ref, inputContainerRef)}
      className={cn(
        "flex justify-center w-full transition-all duration-300 bg-transparent",
      )}
    >
      <div
        className="w-full"
        style={{
          maxWidth: feedMaxWidth,
        }}
      >
        {feedInputMode === "POLL" ? (
          <PollPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
          />
        ) : (
          <StandardPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
          />
        )}
      </div>
    </div>
  );
});

EventFeedForm.displayName = "EventFeedForm";

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

  const feedFormRef = useRef<HTMLDivElement>(null);

  const t = useTranslations("event-feed");
  const feedSlug = `${derivePkgAddr(`gno.land/r/zenao/events/e${eventId}`)}:main`;

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
        {isMember && <EventFeedForm ref={feedFormRef} eventId={eventId} />}
        {tab === "global-feed" ? (
          <PostsList eventId={eventId} userAddress={userAddress} />
        ) : (
          <PollsList eventId={eventId} userAddress={userAddress} />
        )}
      </div>
    </div>
  );
}
