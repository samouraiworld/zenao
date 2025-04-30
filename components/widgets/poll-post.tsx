"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PollPostCard } from "../cards/social-feed/poll-post-card";
import { PollPostView, PollPostViewInfo } from "@/lib/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { pollInfo } from "@/lib/queries/social-feed";

export function PollPost({
  pollId,
  eventId,
  pollPost,
}: {
  pollId: string;
  eventId: string;
  pollPost: PollPostView;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data } = useSuspenseQuery(pollInfo(pollId, userAddress || ""));

  const combined: PollPostViewInfo = useMemo(() => {
    return {
      ...pollPost,
      poll: data,
    };
  }, [pollPost, data]);

  return (
    <PollPostCard
      pollId={pollId}
      eventId={eventId}
      pollPost={combined}
      userAddress={userAddress || ""}
    />
  );
}
