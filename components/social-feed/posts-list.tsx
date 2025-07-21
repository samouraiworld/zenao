"use client";

import { Suspense } from "react";
import { PostCardSkeleton } from "../features/social-feed/post-card-skeleton";
import { PollPost } from "../features/social-feed/poll-post";
import { StandardPostCard } from "@/components/features/social-feed/standard-post-card";
import { SocialFeedPost } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";

export function PostsList({
  eventId,
  posts,
}: {
  eventId: string;
  posts: SocialFeedPost[];
}) {
  return posts.map((post) => {
    switch (post.postType) {
      case "standard":
        return (
          <Suspense
            key={post.data.post.localPostId}
            fallback={<PostCardSkeleton />}
          >
            <StandardPostCard eventId={eventId} post={post.data} canReply />
          </Suspense>
        );
      case "poll":
        const { pollId } = parsePollUri(post.data.post.post.value.uri);

        return (
          <Suspense
            fallback={<PostCardSkeleton />}
            key={post.data.post.localPostId}
          >
            <PollPost eventId={eventId} pollId={pollId} pollPost={post.data} />
          </Suspense>
        );

      case "unknown":
        return null;
    }
  });
}
