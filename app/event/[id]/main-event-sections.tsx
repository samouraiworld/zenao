"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { EventFeed } from "./event-feed";
import { Separator } from "@/components/shadcn/separator";
import { cn } from "@/lib/tailwind";
import { TabsContent } from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/common/markdown-preview";

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
  const [tab, setTab] = useState<"feed" | "description">("feed");
  const t = useTranslations("event");

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
          {t("social-feed")}
        </TabsTrigger>
      </TabsList>
      <Separator className="mb-3" />
      <TabsContent value="description">
        <MarkdownPreview markdownString={description} />
      </TabsContent>
      {/* Social Feed */}
      <TabsContent value="feed">
        <EventFeed eventId={eventId} isMember={isMember} />
      </TabsContent>
    </Tabs>
  );
}
