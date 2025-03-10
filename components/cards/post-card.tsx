import { CircleUserRound } from "lucide-react";
import { Card } from "@/components/cards/Card";
import { Text } from "@/components/texts/DefaultText";
import { LargeText } from "@/components/texts/LargeText";
import { SmallText } from "@/components/texts/SmallText";

export function PostCard() {
  const iconSize = 16;
  return (
    <Card
      className={
        "w-full min-w-full max-w-full flex flex-row justify-between mb-3"
      }
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-row items-center gap-2">
          <Text variant="secondary">xxxxxxx</Text>
        </div>
        <LargeText className="mb-1 line-clamp-3">xxxxx</LargeText>

        {/*<PollResultsList*/}
        {/*  list={poll.results}*/}
        {/*  isPollEnded={isPollEnded}*/}
        {/*  isMultipleAnswers={poll.multipleAnswers}*/}
        {/*  onClickResult={onClickResult}*/}
        {/*/>*/}

        <div className=" flex flex-row items-center justify-between mt-1">
          <div className="hidden sm:flex sm:flex-row sm:gap-4 sm:items-center">
            <CircleUserRound width={iconSize} height={iconSize} />
            <Text className="truncate">xxxxxxxx</Text>
          </div>
          <SmallText variant="secondary">xxxxx</SmallText>
        </div>
      </div>
    </Card>
  );
}
