"use client";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/tailwind";
import {
  screenContainerMarginHorizontal,
  screenContainerMaxWidth,
} from "@/components/layout/ScreenContainer";
import {
  FeedInput,
  FeedInputMode,
  FeedInputPoll,
} from "@/components/form/social-feed/feed-input";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";

export function EventFeed({
  isDescExpanded,
  posts,
  children,
}: {
  isDescExpanded: boolean;
  posts: PostView[];
  children: ReactNode;
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

  return (
    // TODO: Show skeleton while loading (Input and Lists)

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

      {children}
    </div>
  );
}
