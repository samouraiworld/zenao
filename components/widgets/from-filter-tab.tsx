"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { FromFilter } from "@/lib/searchParams";

function FromFilterTab({
  from,
  tabLinks,
}: {
  from: FromFilter;
  tabLinks: { upcoming: string; past: string };
}) {
  const t = useTranslations("events-list");

  return (
    <Tabs value={from}>
      <TabsList className="grid w-full grid-cols-2">
        <Link passHref href={tabLinks.upcoming}>
          <TabsTrigger value="upcoming" className="w-full">
            {t("upcoming")}
          </TabsTrigger>
        </Link>
        <Link passHref href={tabLinks.past}>
          <TabsTrigger value="past" className="w-full">
            {t("past")}
          </TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
}

export default FromFilterTab;
