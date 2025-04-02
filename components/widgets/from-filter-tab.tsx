"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

const FromFilterTab = () => {
  const t = useTranslations("events-list");
  const [tab, setTab] = useQueryState<"upcoming" | "past">(
    "from",
    parseAsStringLiteral(["upcoming", "past"] as const)
      .withDefault("upcoming")
      .withOptions({ shallow: false, throttleMs: 200 }),
  );

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as "upcoming" | "past")}
    >
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upcoming">{t("upcoming")}</TabsTrigger>
        <TabsTrigger value="past">{t("past")}</TabsTrigger>
      </TabsList>
    </Tabs>
  );
};

export default FromFilterTab;
