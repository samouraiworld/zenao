"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Suspense, useMemo } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/shadcn/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import {
  CommunityTabsSchemaType,
  feedPostFormSchema,
  FeedPostFormSchemaType,
} from "@/types/schemas";
import CommunityEvents from "@/app/community/[id]/[tab]/events";
import CommunityChat from "@/app/community/[id]/[tab]/chat";
import CommunityMembers from "@/app/community/[id]/[tab]/members";
import CommunityProposals from "@/app/community/[id]/[tab]/proposals";
import { PostCardSkeleton } from "@/components/social-feed/post-card-skeleton";
import CommunityPolls from "@/app/community/[id]/[tab]/votes";
import { userAddressOptions } from "@/lib/queries/user";
import { communityUserRoles } from "@/lib/queries/community";
import SocialFeedForm from "@/components/social-feed/social-feed-form";

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

  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress),
  );
  const isMember = useMemo(
    () => userRoles.includes("member") || userRoles.includes("administrator"),
    [userRoles],
  );

  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    resolver: zodResolver(feedPostFormSchema),
    defaultValues: {
      content: "",
      question: "",
      options: [{ text: "" }, { text: "" }],
      allowMultipleOptions: false,
      duration: {
        days: 1,
        hours: 0,
        minutes: 0,
      },
    },
  });

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
        <Link href={`/community/${communityId}/votes`}>
          <TabsTrigger
            value="votes"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            {t("votes")}
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

      <Separator className="mb-3" />

      <div className="flex flex-col gap-6 min-h-0 pt-4">
        {(section === "chat" || section === "votes") && isMember && (
          <SocialFeedForm orgType="community" orgId={communityId} form={form} />
        )}

        <TabsContent value="chat">
          <Suspense fallback={<PostCardSkeleton />}>
            <CommunityChat communityId={communityId} />
          </Suspense>
        </TabsContent>
        <TabsContent value="votes">
          <Suspense fallback={<PostCardSkeleton />}>
            <CommunityPolls communityId={communityId} />
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
      </div>
    </Tabs>
  );
}

export default CommunityMainSections;
