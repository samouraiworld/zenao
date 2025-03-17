"use client";

import { ExtraSmallText } from "../texts/extra-small-text";
import { Checkbox } from "../shadcn/checkbox";
import { Gauge } from "@/components/common/gauge";
import { SmallText } from "@/components/texts/SmallText";
import { cn } from "@/lib/tailwind";
import { PollKind, PollResult } from "@/app/gen/polls/v1/polls_pb";

function PollResultItem({
  pollResult,
  totalVotesCount,
  isPollEnded,
  onCheckedChange,
  pollKind,
}: {
  pollResult: PollResult;
  totalVotesCount: number;
  isPollEnded: boolean;
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
        !isPollEnded && "hover:opacity-50 cursor-pointer",
        pollResult.hasUserVoted && "border border-gray-600",
      )}
    >
      <Gauge percent={percent} className="absolute -z-10 left-0" />

      <SmallText className="line-clamp-2">{pollResult.option}</SmallText>

      <div className="flex flex-row items-center gap-3">
        <div className="flex flex-row items-center gap-2">
          <ExtraSmallText>{`${pollResult.count} votes`}</ExtraSmallText>
          <SmallText>{`${percent}%`}</SmallText>
        </div>
        <Checkbox
          checked={pollResult.hasUserVoted}
          onCheckedChange={onCheckedChange}
          className={cn(
            isPollEnded ? "cursor-default" : "cursor-pointer",
            pollKind === PollKind.SINGLE_CHOICE && "rounded-lg",
          )}
        />
      </div>
    </div>
  );
}

export function PollResultsList({
  list,
  isPollEnded,
  pollKind,
  onClickResult,
}: {
  list: PollResult[];
  isPollEnded: boolean;
  pollKind: PollKind;
  onClickResult: (pollResult: PollResult) => void;
}) {
  const totalVotesCount = list.reduce(
    (sum, pollResult) => sum + pollResult.count,
    0,
  );
  return (
    <div className="flex flex-col items-center gap-2">
      {list.map((pollResult, index) => (
        <PollResultItem
          key={index}
          pollResult={pollResult}
          totalVotesCount={totalVotesCount}
          isPollEnded={isPollEnded}
          onCheckedChange={() => {}}
          pollKind={pollKind}
        />
      ))}
    </div>
  );
}
