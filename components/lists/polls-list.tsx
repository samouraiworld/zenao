"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import Text from "../texts/text";
import { PostCardSkeleton } from "../loader/social-feed/post-card-skeleton";
import { userAddressOptions } from "@/lib/queries/user";
import { PollPostCard } from "@/components/cards/social-feed/poll-post-card";
import { PollPostView, PollPostViewInfo } from "@/lib/social-feed";
import { parsePollUri } from "@/lib/multiaddr";
import { pollInfo } from "@/lib/queries/social-feed";

function EmptyPollsList() {
  const t = useTranslations("event-feed");
  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">{t("no-polls-title")}</Text>
      <Text size="sm" variant="secondary">
        {t("no-polls-description")}
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
          const { pollId } = parsePollUri(pollPost.post.post.value.uri);

          return (
            <Suspense fallback={<PostCardSkeleton />} key={pollId}>
              <PollPost pollId={pollId} pollPost={pollPost} />
            </Suspense>
          );
        })
      )}
    </div>
  );
}

function PollPost({
  pollId,
  pollPost,
}: {
  pollId: string;
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
      pollPost={combined}
      userAddress={userAddress || ""}
    />
  );
}
