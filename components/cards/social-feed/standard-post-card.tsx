"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import Text from "@/components/texts/text";
import { profileOptions } from "@/lib/queries/profile";
import { StandardPostView } from "@/lib/social-feed";

export function StandardPostCard({
  eventId,
  post,
}: {
  eventId: string;
  post: StandardPostView;
}) {
  const { data: createdBy } = useSuspenseQuery(
    profileOptions(post.post.author),
  );

  const standardPost = post.post.post.value;

  return (
    <PostCardLayout eventId={eventId} post={post} createdBy={createdBy}>
      <div className="w-full flex flex-col gap-2">
        <Text>{standardPost.content}</Text>
      </div>
    </PostCardLayout>
  );
}
