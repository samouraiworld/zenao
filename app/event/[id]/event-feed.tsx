"use client";

import React, {
  forwardRef,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/lib/tailwind";
import {
  screenContainerMarginHorizontal,
  screenContainerMaxWidth,
} from "@/components/layout/ScreenContainer";
import {
  StandardPostForm,
  FeedInputMode,
} from "@/components/form/social-feed/standard-post-form";
import { fakeStandardPosts, PollPostView } from "@/lib/social-feed";
import { PollPostForm } from "@/components/form/social-feed/poll-post-form";
import { userAddressOptions } from "@/lib/queries/user";
import { feedPosts } from "@/lib/queries/social-feed";
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
  const { theme } = useTheme();
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");
  const [isInputSticky, setInputSticky] = useState(false);
  const [inputOffsetTop, setInputOffsetTop] = useState(0);

  const [bgColor, setBgColor] = useState<string>("");
  useEffect(() => {
    /* Avoid reading CSS variables too early */
    const timeoutId = setTimeout(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      const cssVar = computedStyle.getPropertyValue("--background").trim();

      setBgColor(`hsl(${cssVar} / .9)`);
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [theme]);

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
      setInputOffsetTop(inputContainerRef.current.offsetTop);
    }
  }, [isDescExpanded, inputContainerRef]);

  return (
    <div
      ref={mergeRefs(ref, inputContainerRef)}
      className={cn(
        "flex justify-center w-full transition-all duration-300",
        isInputSticky &&
          `fixed bottom-0 py-4 px-5 left-0 z-50 backdrop-blur-sm`,
      )}
      style={{
        backgroundColor: isInputSticky ? bgColor : "transparent",
      }}
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
  isDescExpanded,
}: {
  eventId: string;
  isDescExpanded: boolean;
}) {
  const [tab, setTab] = useState<EventTab>("global-feed");

  // Check which user is logged in
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const [stickyBottomPadding, setStickyBottomPadding] = useState(0);

  const feedFormRef = useRef<HTMLDivElement>(null);
  // Event's social feed posts
  const { data: posts } = useSuspenseQuery(
    // TODO: Handle offset and limit to make an infinite scroll
    feedPosts(eventId, 0, 100, "", userAddress || ""),
  );

  // Filter polls from posts
  const polls = posts.filter((post): post is PollPostView => {
    return post.post?.post.case === "link" && post.post?.tags?.includes("poll");
  });

  const t = useTranslations("event");

  useEffect(() => {
    if (!feedFormRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height } = entry.contentRect;
        setStickyBottomPadding(height);
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
        <EventFeedForm
          ref={feedFormRef}
          eventId={eventId}
          isDescExpanded={isDescExpanded}
        />
        {tab === "global-feed" ? (
          <PostsList list={fakeStandardPosts} />
        ) : (
          <Suspense fallback={<p>Loading...</p>}>
            <PollsList list={polls} />
          </Suspense>
        )}
      </div>
    </div>
  );
}
