"use client";

import React, { forwardRef, useRef, useState } from "react";
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
import { mergeRefs } from "@/lib/utils";

const _eventTabs = ["description", "discussion", "votes"] as const;
export type EventTab = (typeof _eventTabs)[number];

export const EventFeedForm = forwardRef<
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
