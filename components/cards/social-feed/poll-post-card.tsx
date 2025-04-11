"use client";

import { formatDistanceToNowStrict, fromUnixTime, isAfter } from "date-fns";
import { useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PollKind, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import Text from "@/components/texts/text";
import { PollPostViewInfo } from "@/lib/social-feed";
import { cn } from "@/lib/tailwind";
import { Gauge } from "@/components/common/gauge";
import { Checkbox } from "@/components/shadcn/checkbox";
import { getQueryClient } from "@/lib/get-query-client";
import { useToast } from "@/app/hooks/use-toast";
import { useVotePoll } from "@/lib/mutations/social-feed";
import { Button } from "@/components/shadcn/button";
import { profileOptions } from "@/lib/queries/profile";

export function PollPostCard({
  pollId,
  pollPost,
  userAddress,
}: {
  pollId: string;
  pollPost: PollPostViewInfo;
  userAddress: string;
}) {
  const queryClient = getQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const { data: createdBy } = useSuspenseQuery(
    profileOptions(pollPost.post.author),
  );

  const { votePoll, isPending } = useVotePoll(queryClient);

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
        // title: t("toast-creation-success"),
        title: "TODO: trad (Poll vote success)",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        // title: t("toast-vote-error"),
        title: "TODO: trad (Poll vote error)",
      });
      console.error("error", err);
    }
  };

  return (
    <PostCardLayout post={pollPost} createdBy={createdBy}>
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
              disabled={isPollEnded || isPending}
              onCheckedChange={() => {
                onVote(pollResult.option);
              }}
              pollKind={pollPost.poll.kind}
            />
          ))}
        </div>
      </div>
    </PostCardLayout>
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
        "flex items-center justify-between gap-2 px-4 w-full h-10 relative rounded-lg bg-transparent",
        !disabled && "hover:opacity-50 cursor-pointer",
        disabled && "hover:bg-transparent",
        pollResult.hasUserVoted && "border border-gray-600",
      )}
      onClick={() => {
        if (!disabled) {
          checkboxRef.current?.click();
        }
      }}
    >
      <div>
        <Gauge percent={percent} className="absolute -z-10 left-0" />

        <Text
          className={cn(
            "text-sm line-clamp-2",
            pollResult.hasUserVoted && "text-white",
          )}
        >
          {pollResult.option}
        </Text>

        <div className="flex flex-row items-center gap-3">
          <div className="flex flex-row items-center gap-2">
            <Text className="text-xs">{`${pollResult.count} votes`}</Text>
            <Text className="text-sm">{`${percent}%`}</Text>
          </div>
          <Checkbox
            ref={checkboxRef}
            checked={pollResult.hasUserVoted}
            onCheckedChange={onCheckedChange}
            className={cn(
              disabled ? "cursor-default" : "cursor-pointer",
              pollKind === PollKind.SINGLE_CHOICE && "rounded-lg",
            )}
          />
        </div>
      </div>
    </Button>
  );
}
