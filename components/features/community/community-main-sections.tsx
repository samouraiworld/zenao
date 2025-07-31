"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/shadcn/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { CommunityTabsSchemaType } from "@/types/schemas";
import CommunityEvents from "@/app/community/[id]/[tab]/events";
import CommunityPosts from "@/app/community/[id]/[tab]/posts";
import CommunityMembers from "@/app/community/[id]/[tab]/members";
import CommunityProposals from "@/app/community/[id]/[tab]/proposals";

type CommunityMainSectionsProps = {
  communityId: string;
  section: CommunityTabsSchemaType;
  now: number;
};

function CommunityMainSections({
  communityId,
  section,
  now,
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
        {/* <Link href={`/community/${communityId}/proposals`}>
          <TabsTrigger
            value="proposals"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("proposals")}
          </TabsTrigger>
        </Link> */}
      </TabsList>
      <Separator className="mb-8" />
      <TabsContent value="posts">
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <CommunityPosts communityId={communityId} />
        </Suspense>
      </TabsContent>
      <TabsContent value="events">
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <CommunityEvents communityId={communityId} now={now} />
        </Suspense>
      </TabsContent>
      <TabsContent value="members">
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <CommunityMembers communityId={communityId} />
        </Suspense>
      </TabsContent>
      <TabsContent value="proposals">
        <Suspense fallback={<Loader2 className="animate-spin" />}>
          <CommunityProposals />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}

export default CommunityMainSections;
