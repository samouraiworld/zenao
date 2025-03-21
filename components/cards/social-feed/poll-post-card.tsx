"use client";

import { formatDistanceToNowStrict, fromUnixTime, isAfter } from "date-fns";
import { PollKind, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import Text from "@/components/texts/text";
import { PollPostView } from "@/lib/social-feed";
import { cn } from "@/lib/tailwind";
import { Gauge } from "@/components/common/gauge";
import { Checkbox } from "@/components/shadcn/checkbox";

export function PollPostCard({ pollPost }: { pollPost: PollPostView }) {
  if (!pollPost.post) {
    return null;
  }
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

  return (
    <PostCardLayout post={pollPost}>
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
              disabled={isPollEnded}
              onCheckedChange={() => {
                // TODO: Vote / Unvote / Change vote (So, UpdateVote)
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
  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between gap-2 px-4 w-full h-10 relative rounded-lg",
        !disabled && "hover:opacity-50 cursor-pointer",
        pollResult.hasUserVoted && "border border-gray-600",
      )}
    >
      <Gauge percent={percent} className="absolute -z-10 left-0" />

      <Text className="text-sm line-clamp-2">{pollResult.option}</Text>

      <div className="flex flex-row items-center gap-3">
        <div className="flex flex-row items-center gap-2">
          <Text className="text-xs">{`${pollResult.count} votes`}</Text>
          <Text className="text-sm">{`${percent}%`}</Text>
        </div>
        <Checkbox
          checked={pollResult.hasUserVoted}
          onCheckedChange={onCheckedChange}
          className={cn(
            disabled ? "cursor-default" : "cursor-pointer",
            pollKind === PollKind.SINGLE_CHOICE && "rounded-lg",
          )}
        />
      </div>
    </div>
  );
}
