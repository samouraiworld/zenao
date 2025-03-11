import { CircleUserRound } from "lucide-react";
import { Card } from "@/components/cards/Card";
import { Text } from "@/components/texts/DefaultText";
import { SmallText } from "@/components/texts/SmallText";

export function PostCard() {
  const iconSize = 16;
  return (
    <Card
      className={"w-full min-w-full max-w-full flex flex-row justify-between"}
    >
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-row items-center gap-2">
          <Text variant="secondary">xxxxxxx</Text>
        </div>
        <Text className="mb-1">
          xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
          xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxxxxx xxxxx xxxxx xxxxx
          xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
          xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
          xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xx xxxxx xxxxx xxxxx
          xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
          xxxxx xxxxx xxxxx{" "}
        </Text>

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
