import { useTranslations } from "next-intl";
import { CalendarIcon } from "lucide-react";
import Link from "next/link";
import { PollCard } from "@/components/cards/PollCard";
import { Text } from "@/components/texts/DefaultText";
import { SmallText } from "@/components/texts/SmallText";
import { Button } from "@/components/shadcn/button";
import { Poll } from "@/app/gen/polls/v1/polls_pb";

const EmptyPollsList: React.FC = () => {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col items-center gap-5 mt-10">
      <CalendarIcon
        strokeWidth={0.5}
        width={140}
        height={140}
        className="text-secondary-color"
      />
      <div className="text-center">
        <Text className="font-bold">{t("no-polls")}</Text>
        <SmallText variant="secondary">{t("no-polls-desc")}</SmallText>
      </div>
      <Button variant="secondary">
        {/*TODO: create-poll route*/}
        <Link href="/create-poll">
          <SmallText variant="secondary">Create your poll</SmallText>
        </Link>
      </Button>
    </div>
  );
};

export const PollsList: React.FC<{
  list: Poll[];
}> = ({ list }) => {
  return (
    <div className="my-5">
      {!list.length ? (
        <EmptyPollsList />
      ) : (
        list.map((poll, index) => (
          <PollCard key={index /*TODO: use poll.pkgPath*/} poll={poll} />
        ))
      )}
    </div>
  );
};
