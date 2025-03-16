import React, { useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { SendHorizonal, Vote } from "lucide-react";
import { PollPostCard } from "@/components/cards/social-feed/poll-post-card";
import { fakePolls } from "@/app/event/[id]/fake-polls";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { userAddressOptions } from "@/lib/queries/user";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/tailwind";
import {
  screenContainerMarginHorizontal,
  screenContainerMaxWidth,
} from "@/components/layout/ScreenContainer";
import { fakeStandardPosts } from "@/app/event/[id]/fake-posts";

type FeedInputMode = "POLL" | "STANDARD_POST";

function FeedInput() {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const [mode, setMode] = useState<FeedInputMode>("STANDARD_POST");

  // Auto shrink and grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaValue, setTextAreaValue] = useState("");
  const textareaMaxHeight = 300;
  const textareaMinHeight = 48;
  const placeholder =
    mode === "POLL"
      ? "What do you wanna ask to the community? "
      : "Don't be shy, say something!";
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [textareaValue]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-center gap-4 pr-3">
        {/*<div className="flex justify-center">*/}
        {/*  <UserAvatar address={userAddress} className="size-7 sm:size-8" />*/}
        {/*</div>*/}
        <Textarea
          ref={textareaRef}
          onChange={(evt) => setTextAreaValue(evt.target.value)}
          className="cursor-pointer border-0 focus-visible:ring-transparent rounded-xl px-4 py-2 placeholder:text-primary-color text-lg hover:bg-neutral-700"
          style={{ minHeight: textareaMinHeight, maxHeight: textareaMaxHeight }}
          placeholder={placeholder}
        />
        <div
          className={cn(
            "flex items-center justify-center rounded-full aspect-square cursor-pointer",
            mode === "POLL" ? "bg-white " : "hover:bg-neutral-700",
          )}
          style={{
            height: textareaMinHeight,
            width: textareaMinHeight,
          }}
          onClick={() =>
            setMode((mode) =>
              mode === "STANDARD_POST" ? "POLL" : "STANDARD_POST",
            )
          }
        >
          <Vote color={mode === "POLL" ? "black" : "white"} size={22} />
        </div>
        <div
          className="flex items-center justify-center rounded-full  aspect-square hover:bg-neutral-700 cursor-pointer"
          style={{ height: textareaMinHeight, width: textareaMinHeight }}
        >
          <SendHorizonal color="white" size={22} />
        </div>
      </div>
      {mode === "POLL" && (
        // TODO: mode === "POLL" must open the Poll inputs here
        <div className="w-full h-[200px] bg-amber-100" />
      )}
    </div>
  );
}

export function EventFeed({
  // id,
  // userId,
  isDescExpanded,
}: {
  // id: string;
  // userId: string | null;
  isDescExpanded: boolean;
}) {
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
          isInputSticky && "fixed top-0 py-4 left-0 z-50 backdrop-blur-sm",
        )}
        style={{ backgroundColor: bgColor }}
      >
        <div
          className="w-full"
          style={{
            maxWidth: feedMaxWidth,
          }}
        >
          <FeedInput />
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
