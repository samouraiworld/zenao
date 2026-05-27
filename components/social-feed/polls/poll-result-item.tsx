import { useTranslations } from "next-intl";
import { useRef } from "react";
import { PollKind, PollResult } from "@/app/gen/polls/v1/polls_pb";
import { Button } from "@/components/shadcn/button";
import { Checkbox } from "@/components/shadcn/checkbox";
import { Gauge } from "@/components/widgets/gauge";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";

export default function PollResultItem({
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
  const t = useTranslations("social-feed");
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
