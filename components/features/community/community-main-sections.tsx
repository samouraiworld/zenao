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
import CommunityChat from "@/app/community/[id]/[tab]/chat";
import CommunityMembers from "@/app/community/[id]/[tab]/members";
import CommunityProposals from "@/app/community/[id]/[tab]/proposals";
import { PostCardSkeleton } from "@/components/social-feed/post-card-skeleton";

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
            value="chat"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("chat")}
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
      </TabsList>
      <Separator className="mb-8" />
      <TabsContent value="chat">
        <Suspense fallback={<PostCardSkeleton />}>
          <CommunityChat communityId={communityId} />
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
