"use client";

import React, { forwardRef, useEffect, useRef, useState } from "react";
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
import { PostsList } from "@/components/lists/posts-list";
import { PollsList } from "@/components/lists/polls-list";
import { mergeRefs } from "@/lib/utils";

const eventTabs = ["global-feed", "polls-feed"] as const;
export type EventTab = (typeof eventTabs)[number];

const EventFeedForm = forwardRef<
  HTMLDivElement,
  {
    eventId: string;
    isDescExpanded: boolean;
  }
>(({ eventId, isDescExpanded }, ref) => {
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");
  const [isInputSticky, setInputSticky] = useState(false);
  const [inputOffsetTop, setInputOffsetTop] = useState(0);

  const feedMaxWidth =
    screenContainerMaxWidth - screenContainerMarginHorizontal * 2;

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > inputOffsetTop) {
        setInputSticky(true);
      } else {
        setInputSticky(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [inputOffsetTop]);

  useEffect(() => {
    if (inputContainerRef.current) {
      setInputOffsetTop(
        inputContainerRef.current.offsetTop +
          inputContainerRef.current.clientHeight,
      );
    }
  }, [isDescExpanded, inputContainerRef]);

  return (
    <div
      ref={mergeRefs(ref, inputContainerRef)}
      className={cn(
        "flex justify-center w-full transition-all duration-300",
        isInputSticky &&
          `fixed bottom-0 py-4 px-5 left-0 z-50 backdrop-blur-sm`,
        isInputSticky ? "bg-event-post-form-bg" : "bg-transparent",
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

const DEFAULT_EVENT_FEED_PADDING_BOTTOM = 64;

export function EventFeed({
  eventId,
  isMember,
  isDescExpanded,
}: {
  eventId: string;
  isMember: boolean;
  isDescExpanded: boolean;
}) {
  const [tab, setTab] = useState<EventTab>("global-feed");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const [stickyBottomPadding, setStickyBottomPadding] = useState(
    DEFAULT_EVENT_FEED_PADDING_BOTTOM,
  );

  const feedFormRef = useRef<HTMLDivElement>(null);

  const t = useTranslations("event-feed");

  // Observer to make sure we can see the bottom of the feed
  useEffect(() => {
    if (!feedFormRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        const isSticky =
          window.scrollY > (feedFormRef.current?.offsetTop ?? 0) + height;
        setStickyBottomPadding(
          isSticky ? height : DEFAULT_EVENT_FEED_PADDING_BOTTOM,
        );
      }
    });
    observer.observe(feedFormRef.current);

    return () => observer.disconnect();
  }, [feedFormRef]);

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

      <div
        className="flex flex-col gap-12 min-h-0 pt-4"
        style={{ paddingBottom: stickyBottomPadding }}
      >
        {isMember && (
          <EventFeedForm
            ref={feedFormRef}
            eventId={eventId}
            isDescExpanded={isDescExpanded}
          />
        )}
        {tab === "global-feed" ? (
          <PostsList eventId={eventId} userAddress={userAddress} />
        ) : (
          <PollsList eventId={eventId} userAddress={userAddress} />
        )}
      </div>
    </div>
  );
}
