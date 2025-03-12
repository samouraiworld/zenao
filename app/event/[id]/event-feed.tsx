import { useEffect, useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { PollCard } from "@/components/cards/social-feed/poll-card";
import { fakePolls } from "@/app/event/[id]/fake-polls";
import { PostCard } from "@/components/cards/social-feed/post-card";
import { AvatarWithLoaderAndFallback } from "@/components/common/Avatar";
import { userAddressOptions, userOptions } from "@/lib/queries/user";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/tailwind";

function FeedInput({ className }: { className?: string }) {
  const { getToken, userId } = useAuth();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(userOptions(address));

  // Auto shrink and grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [textareaValue, setTextAreaValue] = useState("");
  const textareaMinHeight = 54;
  const textareaMaxHeight = 300;
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [textareaValue]);

  return (
    <div className={cn("flex flex-row items-center gap-4", className)}>
      {user?.avatarUri && (
        <Link href="/settings">
          <AvatarWithLoaderAndFallback user={user} />
        </Link>
      )}
      <Textarea
        ref={textareaRef}
        onChange={(evt) => setTextAreaValue(evt.target.value)}
        className={`cursor-pointer border-0 min-h-[${textareaMinHeight}px] focus-visible:ring-transparent rounded-xl text-base text-sm px-4 py-3 w-full max-h-[${textareaMaxHeight}px] placeholder:text-primary-color  text-lg hover:bg-neutral-700`}
        placeholder={"Don't be shy, say something!"}
      />
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const inputRef = useRef<HTMLDivElement>(null);
  const [isInputSticky, setInputSticky] = useState(false);
  const [inputOffsetTop, setInputOffsetTop] = useState(0);
  // TODO: ResizeObserver to get the new container width after resize, or regular way ?
  // useEffect(() => {
  //   if (containerRef.current) {
  //     setContainerWidth(containerRef.current.getBoundingClientRect().width);
  //   }
  // }, []);
  useEffect(() => {
    const observer = new ResizeObserver(() => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      }
    });
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, [containerRef]);
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
    <div className="flex flex-col gap-4 min-h-0 pt-4" ref={containerRef}>
      <div
        ref={inputRef}
        className={cn(
          "flex justify-center w-full transition-all duration-300",
          isInputSticky && "fixed top-0 py-4 left-0 z-50 backdrop-blur-sm",
        )}
        style={{ backgroundColor: bgColor }}
      >
        <div style={{ width: containerWidth }}>
          <FeedInput />
        </div>
      </div>

      <div className="flex flex-col w-full rounded-xl overflow-y-auto gap-4">
        <PostCard />
        <PollCard poll={fakePolls[0]} />
        <PollCard poll={fakePolls[1]} />

        <PostCard />
        <PostCard />
        <PollCard poll={fakePolls[2]} />

        <PostCard />
        <PostCard />
        <PollCard poll={fakePolls[3]} />
      </div>
    </div>
  );
}
