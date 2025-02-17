"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useState } from "react";
import Image from "next/image";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { EventsList } from "@/components/lists/EventsList";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { Text } from "@/components/texts/DefaultText";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Button } from "@/components/shadcn/button";
import { SmallText } from "@/components/texts/SmallText";

const HeaderEventsList: React.FC<{
  tab: "upcoming" | "past";
  setTab: Dispatch<SetStateAction<"upcoming" | "past">>;
  title: string;
  description?: string;
}> = ({ tab, setTab, title, description }) => {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <VeryLargeText className="truncate">{title}</VeryLargeText>
          <Button
            variant="secondary"
            className="w-[155px] flex flex-row items-center justify-center"
          >
            <Link
              href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
              target="_blank"
            >
              <SmallText variant="secondary">{t("see-gnoweb")}</SmallText>
            </Link>
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
            onValueChange={(value) => setTab(value as "upcoming" | "past")}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
              <TabsTrigger value="past">{t("past")}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {description && <Text className="line-clamp-2">{description}</Text>}
    </div>
  );
};

export const EventsListLayout: React.FC<{
  upcoming: EventInfo[];
  past: EventInfo[];
  title: string;
  description?: string;
}> = ({ upcoming, past, title, description }) => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <div>
      <HeaderEventsList
        tab={tab}
        setTab={setTab}
        description={description}
        title={title}
      />
      {tab === "upcoming" ? (
        <EventsList list={upcoming} />
      ) : (
        <EventsList list={past} />
      )}
    </div>
  );
};
