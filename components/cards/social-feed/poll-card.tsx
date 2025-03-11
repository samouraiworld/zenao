import { CircleUserRound } from "lucide-react";
import {
  format,
  formatDistanceToNowStrict,
  fromUnixTime,
  isAfter,
} from "date-fns";
import { SmallText } from "../../texts/SmallText";
import { LargeText } from "../../texts/LargeText";
import { Text } from "../../texts/DefaultText";
import { Card } from "../Card";
import { Poll, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { PollResultsList } from "@/components/lists/poll-results-list";

export function PollCard({ poll }: { poll: Poll }) {
  //TODO: Translations

  const iconSize = 16;

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
    <Card
      className={"w-full min-w-full max-w-full flex flex-row justify-between"}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-row items-center gap-2">
          <Text variant="secondary">{`${totalVotesCount} votes`}</Text>
          <Text variant="secondary">•</Text>
          <Text variant="secondary">{remainingTimeText}</Text>
        </div>
        <LargeText className="mb-1 line-clamp-3">{poll.question}</LargeText>

        <PollResultsList
          list={poll.results}
          isPollEnded={isPollEnded}
          // isMultipleAnswers={poll.multipleAnswers}
          isMultipleAnswers={true}
          onClickResult={onClickResult}
        />

        <div className=" flex flex-row items-center justify-between mt-1">
          <div className="hidden sm:flex sm:flex-row sm:gap-4 sm:items-center">
            <CircleUserRound width={iconSize} height={iconSize} />
            <Text className="truncate">{poll.createdBy}</Text>
          </div>
          <SmallText variant="secondary">{startTimeText}</SmallText>
        </div>
      </div>
    </Card>
  );
}
