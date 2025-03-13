import {
  format,
  formatDistanceToNowStrict,
  fromUnixTime,
  isAfter,
} from "date-fns";
import { LargeText } from "../../texts/LargeText";
import { Text } from "../../texts/DefaultText";
import { Poll, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { PollResultsList } from "@/components/lists/poll-results-list";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";

export function PollPostCard({ poll }: { poll: Poll }) {
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
    <PostCardLayout>
      <div className="flex flex-row items-center gap-2">
        <Text variant="secondary">{`${totalVotesCount} votes`}</Text>
        <Text variant="secondary">•</Text>
        <Text variant="secondary">{remainingTimeText}</Text>
      </div>
      <LargeText className="line-clamp-3">{poll.question}</LargeText>

      <PollResultsList
        list={poll.results}
        isPollEnded={isPollEnded}
        // isMultipleAnswers={poll.multipleAnswers}
        isMultipleAnswers={true}
        onClickResult={onClickResult}
      />
    </PostCardLayout>
  );
}
