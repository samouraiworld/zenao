import pluralize from "pluralize";
import { ExtraSmallText } from "../texts/ExtraSmallText";
import { Gauge } from "@/components/common/Gauge";
import { SmallText } from "@/components/texts/SmallText";
import { Checkable, CheckableRounded } from "@/components/common/Checkable";
import { cn } from "@/lib/tailwind";
import { PollResult } from "@/app/gen/polls/v1/polls_pb";

const PollResultBase: React.FC<{
  pollResult: PollResult;
  totalVotesCount: number;
  children?: React.ReactNode;
}> = ({ pollResult, totalVotesCount, children }) => {
  const percent =
    totalVotesCount > 0
      ? Math.round((pollResult.count * 100) / totalVotesCount)
      : 0;
  return (
    <div className="flex flex-row items-center justify-between gap-2 px-4 w-full h-10 relative">
      <Gauge percent={percent} className="absolute -z-10 left-0" />
      <SmallText className="line-clamp-2">{pollResult.option}</SmallText>
      <div className="flex flex-row items-center gap-3">
        <div className="flex flex-row items-center gap-2">
          <ExtraSmallText>{`${pluralize("vote", pollResult.count, true)}`}</ExtraSmallText>
          <SmallText>{`${percent}%`}</SmallText>
        </div>
        {children}
      </div>
    </div>
  );
};

const PollResultSingle: React.FC<{
  pollResult: PollResult;
  totalVotesCount: number;
  isPollEnded: boolean;
  onClick: () => void;
}> = ({ pollResult, totalVotesCount, isPollEnded, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg w-full",
        !isPollEnded && "hover:opacity-50 hover:cursor-pointer",
        pollResult.hasUserVoted && "border border-gray-500",
      )}
    >
      <PollResultBase totalVotesCount={totalVotesCount} pollResult={pollResult}>
        <CheckableRounded checked={pollResult.hasUserVoted} />
      </PollResultBase>
    </div>
  );
};

const PollResultMultiple: React.FC<{
  pollResult: PollResult;
  totalVotesCount: number;
  isPollEnded: boolean;
  onClick: () => void;
}> = ({ pollResult, totalVotesCount, isPollEnded, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-lg w-full",
        !isPollEnded && "hover:opacity-50 hover:cursor-pointer",
        pollResult.hasUserVoted && "border border-gray-500",
      )}
    >
      <PollResultBase totalVotesCount={totalVotesCount} pollResult={pollResult}>
        <Checkable checked={pollResult.hasUserVoted} />
      </PollResultBase>
    </div>
  );
};

export const PollResultsList: React.FC<{
  list: PollResult[];
  isPollEnded: boolean;
  isMultipleAnswers: boolean;
  onClickResult: (pollResult: PollResult) => void;
}> = ({ list, isPollEnded, isMultipleAnswers, onClickResult }) => {
  const totalVotesCount = list.reduce(
    (sum, pollResult) => sum + pollResult.count,
    0,
  );
  return (
    <div className="flex flex-col items-center gap-2 my-2">
      {list.map((pollResult, index) =>
        isMultipleAnswers ? (
          <PollResultMultiple
            key={index}
            pollResult={pollResult}
            totalVotesCount={totalVotesCount}
            isPollEnded={isPollEnded}
            onClick={() => onClickResult(pollResult)}
          />
        ) : (
          <PollResultSingle
            key={index}
            pollResult={pollResult}
            totalVotesCount={totalVotesCount}
            isPollEnded={isPollEnded}
            onClick={() => onClickResult(pollResult)}
          />
        ),
      )}
    </div>
  );
};
