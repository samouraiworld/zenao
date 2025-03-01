"use client";

import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useState } from "react";
import Image from "next/image";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { Text } from "@/components/texts/DefaultText";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Button } from "@/components/shadcn/button";
import { SmallText } from "@/components/texts/SmallText";
import { PollsList } from "@/components/lists/PollsList";
import { Poll } from "@/app/gen/polls/v1/polls_pb";

const HeaderPollsList: React.FC<{
  tab: "started" | "ended";
  setTab: Dispatch<SetStateAction<"started" | "ended">>;
  title: string;
  description?: string;
}> = ({ tab, setTab, title, description }) => {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <VeryLargeText className="truncate">
            TODO: Polls page title
          </VeryLargeText>
          <Button
            variant="secondary"
            className="w-[155px] flex flex-row items-center justify-center"
          >
            {/*<Link*/}
            {/*    href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}*/}
            {/*    target="_blank"*/}
            {/*>*/}
            <SmallText variant="secondary">{t("see-gnoweb")}</SmallText>
            {/*</Link>*/}
            <Image
              src="/gno1.png"
              alt="gno-logo"
              width={25}
              height={25}
              className="rounded-[25px]"
            />
          </Button>
        </div>
        <div className="w-[175px] h-[33px]">
          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as "started" | "ended")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="started">Started</TabsTrigger>
              <TabsTrigger value="ended">Ended</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {description && (
        <Text className="line-clamp-2">TODO: Polls page description</Text>
      )}
    </div>
  );
};

export const PollsListLayout: React.FC<{
  started: Poll[];
  ended: Poll[];
  title: string;
  description?: string;
}> = ({ started, ended, title, description }) => {
  const [tab, setTab] = useState<"started" | "ended">("started");

  return (
    <div>
      <HeaderPollsList
        tab={tab}
        setTab={setTab}
        description={description}
        title={title}
      />
      {tab === "started" ? (
        <PollsList list={started} />
      ) : (
        <PollsList list={ended} />
      )}
    </div>
  );
};
