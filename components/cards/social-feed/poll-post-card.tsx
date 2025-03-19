"use client";

import {
  format,
  formatDistanceToNowStrict,
  fromUnixTime,
  isAfter,
} from "date-fns";
import { Poll, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { PollResultsList } from "@/components/lists/poll-results-list";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { Post } from "@/app/gen/feeds/v1/feeds_pb";
import Text from "@/components/texts/text";

export function PollPostCard({ poll, post }: { poll: Poll; post: Post }) {
  const now = new Date();
  const endTime = Number(poll.createdAt) + Number(poll.duration);
  const isPollEnded = isAfter(now, new Date(endTime * 1000));
  const totalVotesCount = poll.results.reduce(
    (sum, pollResult) => sum + pollResult.count,
    0,
  );
  const remainingTimeText = isPollEnded
    ? "Ended"
    : `${formatDistanceToNowStrict(fromUnixTime(Number(endTime)))} remaining`;
  const startTimeText = `Started on ${format(fromUnixTime(Number(poll.createdAt)), "Pp")}`;

  const onClickResult = (pollResult: PollResult) => {
    //TODO
  };

  return (
    <PostCardLayout post={post}>
      <div className="w-full flex flex-col gap-2">
        <div className="flex flex-row items-center gap-2">
          <Text className="text-sm">{`${totalVotesCount} votes`}</Text>
          <Text className="text-sm">•</Text>
          <Text className="text-sm">{remainingTimeText}</Text>
        </div>
        <Text className="line-clamp-3">{poll.question}</Text>

        <PollResultsList
          list={poll.results}
          isPollEnded={isPollEnded}
          pollKind={poll.kind}
          onClickResult={onClickResult}
        />
      </div>
    </PostCardLayout>
  );
}
