import { CircleUserRound } from "lucide-react";
import {
  format,
  formatDistanceToNowStrict,
  fromUnixTime,
  isAfter,
} from "date-fns";
import pluralize from "pluralize";
import { SmallText } from "../texts/SmallText";
import { LargeText } from "../texts/LargeText";
import { Text } from "../texts/DefaultText";
import { Card } from "./Card";
import { PollResultsList } from "@/components/lists/PollResultsList";
import { Poll, PollResult } from "@/app/gen/polls/v1/polls_pb";

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
  const endTimeText = `End: ${format(fromUnixTime(Number(endTime)), "Pp")}`;
  const startTimeText = `Started on ${format(fromUnixTime(Number(poll.createdAt)), "Pp")}`;

  const onClickResult = (pollResult: PollResult) => {
    //TODO
  };

  return (
    <div className="flex flex-col sm:flex-row sm:justify-between">
      <div className="min-w-48 left-6 relative sm:left-0 sm:flex">
        <div className="flex flex-row items-center gap-[6px] mb-3 sm:items-start sm:mb-0 sm:gap-0 sm:flex-col">
          <Text>{remainingTimeText}</Text>
          <SmallText variant="secondary">{endTimeText}</SmallText>
        </div>
      </div>

      <div className="flex flex-row w-full justify-between">
        <div className="mr-5">
          <div className="h-[10px] w-[10px] rounded-xl relative right-[4px] bg-secondary-color" />
          <div className="h-full border-l-2 border-dashed border-secondary-color opacity-30" />
        </div>
        {/*<Link*/}
        {/*  className="w-full flex"*/}
        {/*  href={`/poll/${idFromPkgPath(poll.pkgPath)}`}*/}
        {/*>*/}
        <Card
          className={
            "w-full min-w-full max-w-full flex flex-row justify-between mb-3"
          }
        >
          <div className="flex flex-col gap-2 w-full">
            <div className="flex flex-row items-center gap-2">
              <Text variant="secondary">
                {pluralize("vote", totalVotesCount, true)}
              </Text>
            </div>
            <LargeText className="mb-1 line-clamp-3">{poll.question}</LargeText>

            <PollResultsList
              list={poll.results}
              isPollEnded={isPollEnded}
              isMultipleAnswers={poll.multipleAnswers}
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
        {/*</Link>*/}
      </div>
    </div>
  );
}

function idFromPkgPath(pkgPath: string): string {
  const res = /(e\d+)$/.exec(pkgPath);
  return res?.[1].substring(1) || "";
}
