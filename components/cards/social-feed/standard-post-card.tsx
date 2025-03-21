"use client";

import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";
import Text from "@/components/texts/text";

export function StandardPostCard({ post }: { post: PostView }) {
  if (!post.post || post.post?.post.case !== "standard") {
    return null;
  }
  const standardPost = post.post.post.value;
  return (
    <PostCardLayout post={post}>
      <div className="w-full flex flex-col gap-2">
        <Text>{standardPost.content}</Text>
      </div>
    </PostCardLayout>
  );
}
