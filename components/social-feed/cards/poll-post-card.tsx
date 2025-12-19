"use client";

import { formatDistanceStrict, fromUnixTime, isAfter } from "date-fns";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import PollResultItem from "../polls/poll-result-item";
import { PostCardLayout } from "./post-card-layout";
import Text from "@/components/widgets/texts/text";
import { PollPostViewInfo } from "@/lib/social-feed";
import { getQueryClient } from "@/lib/get-query-client";
import { useToast } from "@/hooks/use-toast";
import { useVotePoll } from "@/lib/mutations/social-feed";
import { profileOptions } from "@/lib/queries/profile";
import { useLayoutNow } from "@/hooks/use-layout-now";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

export function PollPostCard({
  pollId,
  pollPost,
  userRealmId,
  canReply,
  canInteract,
  onDelete,
  onReactionChange,
  isDeleting,
  isReacting,
  replyHref,
  isOwner,
}: {
  pollId: string;
  pollPost: PollPostViewInfo;
  userRealmId: string;
  canReply?: boolean;
  canInteract?: boolean;
  isOwner?: boolean;
  replyHref?: string;
  onDelete?: (parentId?: string) => void;
  onReactionChange?: (icon: string) => void | Promise<void>;
  isDeleting?: boolean;
  isReacting?: boolean;
}) {
  const t = useTranslations("social-feed");
  const queryClient = getQueryClient();
  const { getToken } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { toast } = useToast();

  const { data: createdBy } = useSuspenseQuery(
    profileOptions(pollPost.post.author),
  );

  const { votePoll, isPending } = useVotePoll(queryClient);

  const now = useLayoutNow();
  const endTime =
    Number(pollPost.poll.createdAt) + Number(pollPost.poll.duration);
  const isPollEnded = isAfter(now, new Date(endTime * 1000));
  const totalVotesCount = pollPost.poll.results.reduce(
    (sum, pollResult) => sum + pollResult.count,
    0,
  );
  const remainingTimeText = isPollEnded
    ? "Ended"
    : `${formatDistanceStrict(now, fromUnixTime(Number(endTime)))} remaining`;

  const onVote = async (option: string) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await votePoll({
        token,
        pollId,
        option,
        userRealmId,
      });
      trackEvent("PollVoteUpdated", {
        props: {
          pollId,
        },
      });

      toast({
        title: t("vote.toast-vote-success"),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("vote.toast-vote-error"),
      });
      console.error("error", err);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <PostCardLayout
        post={pollPost}
        createdBy={createdBy}
        canReply={canReply}
        canInteract={canInteract}
        isDeleting={isDeleting}
        onDelete={onDelete}
        isOwner={isOwner}
        onReactionChange={onReactionChange}
        isReacting={isReacting}
        replyHref={replyHref}
      >
        <div className="w-full flex flex-col gap-2">
          <div className="flex flex-row items-center gap-2">
            <Text className="text-sm">{`${totalVotesCount} votes`}</Text>
            <Text className="text-sm">•</Text>
            <Text className="text-sm">{remainingTimeText}</Text>
          </div>
          <Text className="line-clamp-3">{pollPost.poll.question}</Text>

          <div className="flex flex-col items-center gap-2">
            {pollPost.poll.results.map((pollResult, index) => (
              <PollResultItem
                key={index}
                pollResult={pollResult}
                totalVotesCount={totalVotesCount}
                disabled={isPollEnded || isPending || !canInteract}
                onCheckedChange={() => {
                  onVote(pollResult.option);
                }}
                pollKind={pollPost.poll.kind}
              />
            ))}
          </div>
        </div>
      </PostCardLayout>
    </div>
  );
}
