"use client";

import Text from "../texts/text";
import { PostView } from "@/app/gen/feeds/v1/feeds_pb";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";

function EmptyPostsList() {
  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">No post to show</Text>
      <Text size="sm" variant="secondary">
        There is no post for this Event yet
      </Text>
    </div>
  );
}

export function PostsList({ list }: { list: PostView[] }) {
  // We show posts "standard" only for now
  const postsStandard = list.filter(
    (post) => post.post?.post.case === "standard",
  );

  // TODO: PollPostView[] here ?
  // We also show polls
  // const polls = list.map(post =>
  //   post.post.case = "link"
  // );

  return (
    <div className="space-y-4">
      {!postsStandard.length ? (
        <EmptyPostsList />
      ) : (
        postsStandard.map((post, index) => (
          <StandardPostCard key={index} post={post} />
        )) //TODO: Better key?
      )}
    </div>
  );
}
