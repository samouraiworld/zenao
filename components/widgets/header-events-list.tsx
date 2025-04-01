"use client";

import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import Heading from "../texts/heading";
import { GnowebButton } from "../buttons/GnowebButton";
import Text from "../texts/text";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";

const HeaderEventsList: React.FC<{
  title: string;
  description?: string;
}> = ({ title, description }) => {
  const [tab, setTab] = useQueryState<"upcoming" | "past">(
    "from",
    parseAsStringLiteral(["upcoming", "past"] as const)
      .withDefault("upcoming")
      .withOptions({ shallow: false, throttleMs: 200 }),
  );
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

export default HeaderEventsList;
