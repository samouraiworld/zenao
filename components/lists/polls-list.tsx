"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import Text from "../texts/text";
import { PollPostCardSkeleton } from "../loader/social-feed/poll-post-card-skeleton";
import { userAddressOptions } from "@/lib/queries/user";
import { PollPostCard } from "@/components/cards/social-feed/poll-post-card";
import { PollPostView, PollPostViewInfo } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { fetchPoll } from "@/lib/queries/social-feed";

function EmptyPollsList() {
  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">No poll to show</Text>
      <Text size="sm" variant="secondary">
        There is no poll for this Event yet
      </Text>
    </div>
  );
}

export function PollsList({ list }: { list: PollPostView[] }) {
  return (
    <div className="space-y-4">
      {!list.length ? (
        <EmptyPollsList />
      ) : (
        list.map((pollPost) => {
          const { packagePath, pollId } = parsePollUri(
            pollPost.post.post.value.uri,
          );

          return (
            <Suspense fallback={<PollPostCardSkeleton />} key={pollId}>
              <PollPost
                packagePath={packagePath}
                pollId={pollId}
                pollPost={pollPost}
              />
            </Suspense>
          );
        })
      )}
    </div>
  );
}

function PollPost({
  packagePath,
  pollId,
  pollPost,
}: {
  packagePath: string;
  pollId: string;
  pollPost: PollPostView;
}) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data } = useSuspenseQuery(
    fetchPoll(packagePath, pollId, userAddress || ""),
  );

  const combined: PollPostViewInfo = useMemo(() => {
    return {
      ...pollPost,
      poll: data,
    };
  }, [pollPost, data]);

  return <PollPostCard pollId={pollId} pollPost={combined} />;
}
