"use client";

import { formatDistanceToNowStrict, fromUnixTime, isAfter } from "date-fns";
import { useMemo, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PollKind, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { PostCardLayout } from "@/components/features/social-feed/post-card-layout";
import Text from "@/components/widgets/texts/text";
import { PollPostViewInfo } from "@/lib/social-feed";
import { cn } from "@/lib/tailwind";
import { Gauge } from "@/components/common/gauge";
import { Checkbox } from "@/components/shadcn/checkbox";
import { getQueryClient } from "@/lib/get-query-client";
import { useToast } from "@/app/hooks/use-toast";
import { useVotePoll } from "@/lib/mutations/social-feed";
import { Button } from "@/components/shadcn/button";
import { profileOptions } from "@/lib/queries/profile";
import { eventUserRoles } from "@/lib/queries/event-users";

export function PollPostCard({
  pollId,
  eventId,
  pollPost,
  userAddress,
  canReply,
}: {
  pollId: string;
  eventId: string;
  pollPost: PollPostViewInfo;
  userAddress: string;
  canReply?: boolean;
}) {
  const t = useTranslations("event-feed");
  const queryClient = getQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const { data: createdBy } = useSuspenseQuery(
    profileOptions(pollPost.post.author),
  );

  const { votePoll, isPending } = useVotePoll(queryClient);

  const { data: roles } = useSuspenseQuery(
    eventUserRoles(eventId, userAddress),
  );

  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);

  const now = new Date();
  const endTime =
    Number(pollPost.poll.createdAt) + Number(pollPost.poll.duration);
  const isPollEnded = isAfter(now, new Date(endTime * 1000));
  const totalVotesCount = pollPost.poll.results.reduce(
    (sum, pollResult) => sum + pollResult.count,
    0,
  );
  const remainingTimeText = isPollEnded
    ? "Ended"
    : `${formatDistanceToNowStrict(fromUnixTime(Number(endTime)))} remaining`;

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
        userAddress,
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
        eventId={eventId}
        post={pollPost}
        createdBy={createdBy}
        gnowebHref={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/${process.env.NEXT_PUBLIC_ZENAO_NAMESPACE}/polls:${parseInt(pollId, 10).toString(16).padStart(7, "0")}`}
        canReply={canReply}
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
                disabled={
                  isPollEnded || isPending || (!isOrganizer && !isParticipant)
                }
                onCheckedChange={() => {
                  onVote(pollResult.option);
                }}
                pollKind={pollPost.poll.kind}
              />
            ))}
          </div>
        </div>
      </PostCardLayout>
      {/* {showReplies && (
        <div className="pl-6">
          <Suspense fallback={<PostCardSkeleton />}>
            <PostComments
              eventId={eventId}
              parentId={pollPost.post.localPostId.toString()}
            />
          </Suspense>
        </div>
      )} */}
    </div>
  );
}

function PollResultItem({
  pollResult,
  totalVotesCount,
  disabled,
  onCheckedChange,
  pollKind,
}: {
  pollResult: PollResult;
  totalVotesCount: number;
  disabled: boolean;
  onCheckedChange: (checked: boolean) => void;
  pollKind: PollKind;
}) {
  const t = useTranslations("event-feed");
  const percent =
    totalVotesCount > 0
      ? Math.round((pollResult.count * 100) / totalVotesCount)
      : 0;
  const checkboxRef = useRef<HTMLButtonElement>(null);

  return (
    <Button
      asChild
      variant="outline"
      disabled={disabled}
      className={cn(
        "flex items-center justify-between gap-2 px-4 w-full h-10 relative rounded-lg hover:bg-transparent bg-transparent",
        !disabled && !pollResult.hasUserVoted && "hover:border-neutral-500",
        !disabled && "cursor-pointer",
        pollResult.hasUserVoted && "border border-custom-input-border",
      )}
      onClick={() => {
        if (!disabled) {
          checkboxRef.current?.click();
        }
      }}
    >
      <div>
        <Gauge
          percent={percent}
          className="absolute -z-10 left-0 bg-neutral-200/50 dark:bg-neutral-800/50"
        />

        <Text className="text-sm line-clamp-2">{pollResult.option}</Text>

        <div className="flex flex-row items-center gap-3">
          <div className="flex flex-row items-center gap-2">
            <Text className="text-xs">
              {t("poll.result-count", { count: pollResult.count })}
            </Text>
            <Text className="text-sm">{`${percent}%`}</Text>
          </div>
          <Checkbox
            ref={checkboxRef}
            disabled={disabled}
            checked={pollResult.hasUserVoted}
            onCheckedChange={onCheckedChange}
            className={cn(
              "cursor-pointer disabled:opacity-100 disabled:cursor-default",
              pollKind === PollKind.SINGLE_CHOICE && "rounded-lg",
            )}
          />
        </div>
      </div>
    </Button>
  );
}
