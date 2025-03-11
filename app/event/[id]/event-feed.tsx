import React from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { PollCard } from "@/components/cards/social-feed/poll-card";
import { fakePolls } from "@/app/event/[id]/fake-polls";
import { PostCard } from "@/components/cards/social-feed/post-card";
import { cn } from "@/lib/tailwind";
import { ButtonBase } from "@/components/buttons/ButtonBases";
import { Text } from "@/components/texts/DefaultText";
import { AvatarWithLoaderAndFallback } from "@/components/common/Avatar";
import { userAddressOptions, userOptions } from "@/lib/queries/user";

function FeedInput({ className }: { className?: string }) {
  const { getToken, userId } = useAuth();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(userOptions(address));

  return (
    <>
      <div className={cn("flex flex-row items-center gap-4", className)}>
        {user?.avatarUri && (
          <Link href="/settings">
            <AvatarWithLoaderAndFallback user={user} />
          </Link>
        )}
        <ButtonBase className="flex-1 justify-start h-auto px-4 py-3 rounded-xl border-secondary/80 bg-transparent backdrop-blur-sm hover:bg-neutral-700 ">
          <Text className="!text-lg font-semibold">
            {"Don't be shy, say something!"}
          </Text>
        </ButtonBase>
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
      className="flex flex-col gap-4 min-h-0"
      style={{ maxHeight: "calc(100vh - 52px)" }}
    >
      <FeedInput className="mt-4" />

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
