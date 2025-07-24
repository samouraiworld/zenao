"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PollPostCard } from "./poll-post-card";
import { PollPostView, PollPostViewInfo } from "@/lib/social-feed";
import { pollInfo } from "@/lib/queries/social-feed";

export function PollPost({
  pollId,
  userAddress,
  pollPost,
  onDelete,
  onReactionChange,
  isDeleting,
  isReacting,
  canReply,
  replyHref,
  canInteract,
  isOwner,
}: {
  pollId: string;
  userAddress: string | null;
  pollPost: PollPostView;
  canReply?: boolean;
  replyHref?: string;
  onDelete?: (parentId?: string) => void;
  onReactionChange?: (icon: string) => void | Promise<void>;
  isDeleting?: boolean;
  isReacting?: boolean;
  isOwner?: boolean;
  canInteract?: boolean;
}) {
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
      pollPost={combined}
      userAddress={userAddress || ""}
      onDelete={onDelete}
      onReactionChange={onReactionChange}
      isDeleting={isDeleting}
      isReacting={isReacting}
      canReply={canReply}
      replyHref={replyHref}
      canInteract={canInteract}
      isOwner={isOwner}
    />
  );
}
