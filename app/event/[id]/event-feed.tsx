import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { PollCard } from "@/components/cards/social-feed/poll-card";
import { fakePolls } from "@/app/event/[id]/fake-polls";
import { PostCard } from "@/components/cards/social-feed/post-card";
import { AvatarWithLoaderAndFallback } from "@/components/common/Avatar";
import { userAddressOptions, userOptions } from "@/lib/queries/user";
import { Textarea } from "@/components/shadcn/textarea";
import { footerHeight } from "@/app/Footer";

function FeedInput() {
  const { getToken, userId } = useAuth();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(userOptions(address));

  return (
    <>
      <div className="flex flex-row items-center gap-4">
        {user?.avatarUri && (
          <Link href="/settings">
            <AvatarWithLoaderAndFallback user={user} />
          </Link>
        )}
        {/*TODO: Make textarea auto shrink, and grow until max height*/}
        <Textarea
          className="cursor-pointer border-0 h-[54px] min-h-[54px] focus-visible:ring-transparent rounded-xl text-base text-sm px-4 py-3 w-full max-h-[200px] placeholder:text-primary-color  text-lg hover:bg-neutral-700"
          placeholder={"Don't be shy, say something!"}
        />
      </div>
    </>
  );
}

export function EventFeed(
  {
    // id,
    // userId,
  }: {
    // id: string;
    // userId: string | null;
  },
) {
  return (
    <div
      className="flex flex-col gap-4 min-h-0 pt-4"
      style={{ maxHeight: `calc(100vh - ${footerHeight}px)` }}
    >
      <FeedInput />

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
