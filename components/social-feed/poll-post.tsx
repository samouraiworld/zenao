"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { PollPostCard } from "./poll-post-card";
import { PollPostView, PollPostViewInfo } from "@/lib/social-feed";
import { pollInfo } from "@/lib/queries/social-feed";

export function PollPost({
  pollId,
  userRealmId,
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
  userRealmId: string;
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
  const { data } = useSuspenseQuery(pollInfo(pollId, userRealmId));

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
      userRealmId={userRealmId}
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
