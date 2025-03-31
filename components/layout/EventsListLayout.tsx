"use client";

import { useTranslations } from "next-intl";
import { Dispatch, SetStateAction, useState } from "react";
import { GnowebButton } from "../buttons/GnowebButton";
import Heading from "../texts/heading";
import Text from "../texts/text";
import { EventsList } from "@/components/lists/EventsList";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

const HeaderEventsList: React.FC<{
  tab: "upcoming" | "past";
  setTab: Dispatch<SetStateAction<"upcoming" | "past">>;
  title: string;
  description?: string;
}> = ({ tab, setTab, title, description }) => {
  const t = useTranslations("events-list");
  return (
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex flex-col gap-2 md:gap-0 md:flex-row md:justify-between md:items-center">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <Heading level={1} size="4xl" className="truncate">
            {title}
          </Heading>
          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/eventreg`}
          />
        </div>
        <div>
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

      {description && (
        <Text variant="secondary" className="line-clamp-2">
          {description}
        </Text>
      )}
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
