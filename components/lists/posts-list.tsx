"use client";

import { Suspense } from "react";
import Text from "../texts/text";
import { PostCardSkeleton } from "../loader/social-feed/post-card-skeleton";
import { StandardPostCard } from "@/components/cards/social-feed/standard-post-card";
import { StandardPostView } from "@/lib/social-feed";

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

export function PostsList({ list }: { list: StandardPostView[] }) {
  return (
    <div className="space-y-4">
      {!list.length ? (
        <EmptyPostsList />
      ) : (
        list.map((post) => (
          <Suspense key={post.post.localPostId} fallback={<PostCardSkeleton />}>
            <StandardPostCard post={post} />
          </Suspense>
        ))
      )}
    </div>
  );
}
