"use client";

import { useTranslations } from "next-intl";
import { useSelectedLayoutSegment } from "next/navigation";
import Link from "next/link";
import { useDashboardCommunityContext } from "./dashboard-community-context-provider";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { Badge } from "@/components/shadcn/badge";
import { Separator } from "@/components/shadcn/separator";

interface DashboardCommunityTabsProps {
  children: React.ReactNode;
}

export default function DashboardCommunityTabs({
  children,
}: DashboardCommunityTabsProps) {
  const t = useTranslations("dashboard.communityDetails.communityTabs");
  const { communityId, communityInfo } = useDashboardCommunityContext();
  const section = useSelectedLayoutSegment() || "general";

  return (
    <Tabs value={section} className="w-full min-h-[300px]">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/dashboard/community/${communityId}`} scroll={false}>
          <TabsTrigger
            value="general"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("general")}
          </TabsTrigger>
        </Link>
        <Link
          href={`/dashboard/community/${communityId}/members`}
          scroll={false}
        >
          <TabsTrigger
            value="members"
            className="w-fit flex gap-2 p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("members")}{" "}
            <Badge variant="secondary">{communityInfo.countMembers}</Badge>
          </TabsTrigger>
        </Link>

        <Link
          href={`/dashboard/community/${communityId}/administrators`}
          scroll={false}
        >
          <TabsTrigger
            value="administrators"
            className="w-fit gap-2 p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("administrators")}{" "}
            <Badge variant="secondary">
              {communityInfo.administrators.length}
            </Badge>
          </TabsTrigger>
        </Link>
        <Link
          href={`/dashboard/community/${communityId}/events`}
          scroll={false}
        >
          <TabsTrigger
            value="events"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("events")}
          </TabsTrigger>
        </Link>
      </TabsList>
      <Separator className="mb-3" />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          <TabsContent value={section}>{children}</TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
