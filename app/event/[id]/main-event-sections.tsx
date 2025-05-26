"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { EventFeedForm } from "./event-feed-form";
import { Separator } from "@/components/shadcn/separator";
import { cn } from "@/lib/tailwind";
import { TabsContent } from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import { PollsList } from "@/components/widgets/polls-list";
import { PostsList } from "@/components/widgets/posts-list";
import { userAddressOptions } from "@/lib/queries/user";

export function MainEventSections({
  className,
  eventId,
  description,
  isMember,
}: {
  eventId: string;
  description: string;
  isMember: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<"description" | "feed" | "votes">(
    "description",
  );
  const t = useTranslations("event");

  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );

  const feedFormRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTab(isMember ? "feed" : "description");
  }, [isMember]);

  return (
    <Tabs
      defaultValue={isMember ? "feed" : "description"}
      value={tab}
      onValueChange={(value) => setTab(value as "feed" | "description")}
      className={cn("w-full", className)}
    >
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto">
        <TabsTrigger
          value="description"
          className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
        >
          {t("about-event")}
        </TabsTrigger>
        <TabsTrigger
          value="feed"
          className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
        >
          {t("discussion")}
        </TabsTrigger>
        <TabsTrigger
          value="votes"
          className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
        >
          {t("votes")}
        </TabsTrigger>
      </TabsList>
      <Separator className="mb-3" />

      <TabsContent value="description">
        <MarkdownPreview markdownString={description} />
      </TabsContent>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-6 min-h-0 pt-4">
          {tab !== "description" && isMember && (
            <EventFeedForm ref={feedFormRef} eventId={eventId} />
          )}
          {/* Social Feed (Discussions) */}
          <TabsContent value="feed">
            <PostsList eventId={eventId} userAddress={userAddress} />
          </TabsContent>
          {/* Social Feed (Votes) */}
          <TabsContent value="votes">
            <PollsList eventId={eventId} userAddress={userAddress} />
          </TabsContent>
        </div>
      </div>
    </Tabs>
  );
}
