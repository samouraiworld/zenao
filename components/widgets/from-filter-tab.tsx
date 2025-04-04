"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { FromFilter } from "@/lib/searchParams";

function FromFilterTab({ from }: { from: FromFilter }) {
  const t = useTranslations("events-list");

  return (
    <Tabs value={from}>
      <TabsList className="grid w-full grid-cols-2">
        <Link passHref href="/discover">
          <TabsTrigger value="upcoming" className="w-full">
            {t("upcoming")}
          </TabsTrigger>
        </Link>
        <Link passHref href="/discover/past">
          <TabsTrigger value="past" className="w-full">
            {t("past")}
          </TabsTrigger>
        </Link>
      </TabsList>
    </Tabs>
  );
}

export default FromFilterTab;
