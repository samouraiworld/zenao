"use client";

import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useState } from "react";
import { GnowebButton } from "../buttons/gnoweb-button";
import { ExtraLargeText } from "@/components/texts/extra-large-text";
import { EventsList } from "@/components/lists/events-list";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { Text } from "@/components/texts/default-text";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

function EventsListHeader({
  tab,
  setTab,
  title,
  description,
}: {
  tab: "upcoming" | "past";
  setTab: Dispatch<SetStateAction<"upcoming" | "past">>;
  title: string;
  description?: string;
}) {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row sm:justify-between">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <ExtraLargeText className="truncate">{title}</ExtraLargeText>
          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
          />
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
}

export function EventsListContainer({
  upcoming,
  past,
  title,
  description,
}: {
  upcoming: EventInfo[];
  past: EventInfo[];
  title: string;
  description?: string;
}) {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  return (
    <div>
      <EventsListHeader
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
}
