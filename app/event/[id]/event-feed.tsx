"use client";
import React, { useEffect, useRef, useState } from "react";
import { PollPostCard } from "@/components/cards/social-feed/poll-post-card";
import { fakePolls } from "@/app/event/[id]/fake-polls";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { cn } from "@/lib/tailwind";
import {
  screenContainerMarginHorizontal,
  screenContainerMaxWidth,
} from "@/components/layout/ScreenContainer";
import { fakeStandardPosts } from "@/app/event/[id]/fake-posts";
import {
  FeedInput,
  FeedInputMode,
  FeedInputPoll,
} from "@/components/form/social-feed/feed-input";

export function EventFeed({
  // id,
  // userId,
  isDescExpanded,
}: {
  // id: string;
  // userId: string | null;
  isDescExpanded: boolean;
}) {
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");

  // Getting --background value. Used for sticky FeedInput background
  const [bgColor, setBgColor] = useState("");
  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    const cssVar = computedStyle.getPropertyValue("--background").trim();
    setBgColor(`hsl(${cssVar} / .9)`);
  }, []);
  //  Stuff used to stick FeedInput when scroll bellow of it
  const feedMaxWidth =
    screenContainerMaxWidth - screenContainerMarginHorizontal * 2;
  const inputRef = useRef<HTMLDivElement>(null);
  const [isInputSticky, setInputSticky] = useState(false);
  const [inputOffsetTop, setInputOffsetTop] = useState(0);
  useEffect(() => {
    if (inputRef.current) {
      setInputOffsetTop(inputRef.current.offsetTop);
    }
  }, [isDescExpanded]);
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
  // --------

  // LinkPost => uri => parse and get poll id
  //TODO: query polls.gno Kind(linkPostUri) => get LinkPostKind
  //TODO: Control LINK_POST_KIND_POLL
  //TODO: query polls.gno GetInfo(pollId)

  // TODO: Show skeleton while loading

  return (
    <div className="flex flex-col gap-4 min-h-0 pt-4">
      <div
        ref={inputRef}
        className={cn(
          "flex justify-center w-full transition-all duration-300",
          isInputSticky &&
            "fixed bottom-0 py-4 px-5 left-0 z-50 backdrop-blur-sm",
        )}
        style={{ backgroundColor: bgColor }}
      >
        <div
          className="w-full"
          style={{
            maxWidth: feedMaxWidth,
          }}
        >
          {feedInputMode === "POLL" ? (
            <FeedInputPoll
              feedInputMode={feedInputMode}
              setFeedInputMode={setFeedInputMode}
            />
          ) : (
            <FeedInput
              feedInputMode={feedInputMode}
              setFeedInputMode={setFeedInputMode}
            />
          )}
        </div>
      </div>

      <div className="flex flex-col w-full rounded-xl overflow-y-auto gap-4">
        {fakeStandardPosts.map((post, index) => (
          <StandardPostCard post={post} key={index} />
        ))}

        {/*<StandardPostCard />*/}
        <PollPostCard poll={fakePolls[0]} post={fakeStandardPosts[0]} />
        <PollPostCard poll={fakePolls[1]} post={fakeStandardPosts[1]} />

        {/*<StandardPostCard />*/}
        {/*<StandardPostCard />*/}
        <PollPostCard poll={fakePolls[2]} post={fakeStandardPosts[2]} />

        {/*<StandardPostCard />*/}
        {/*<StandardPostCard />*/}
        <PollPostCard poll={fakePolls[3]} post={fakeStandardPosts[3]} />
      </div>
    </div>
  );
}
