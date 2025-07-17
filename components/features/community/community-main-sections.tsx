"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Separator } from "@/components/shadcn/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { CommunityTabsSchemaType } from "@/types/schemas";

type CommunityMainSectionsProps = {
  communityId: string;
  section: CommunityTabsSchemaType;
};

function CommunityMainSections({
  communityId,
  section,
}: CommunityMainSectionsProps) {
  const t = useTranslations("community");

  return (
    <Tabs value={section} className="w-full">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/community/${communityId}`}>
          <TabsTrigger
            value="posts"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("posts")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/events`}>
          <TabsTrigger
            value="events"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("events")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/members`}>
          <TabsTrigger
            value="members"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("members")}
          </TabsTrigger>
        </Link>
        <Link href={`/community/${communityId}/proposals`}>
          <TabsTrigger
            value="proposals"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("proposals")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />
    </Tabs>
  );
}

export default CommunityMainSections;
