"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { EventFeed } from "./event-feed";
import { Separator } from "@/components/shadcn/separator";
import { cn } from "@/lib/tailwind";
import { TabsContent } from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/common/markdown-preview";

export function EventSectionTab({
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
  return (
    <Tabs defaultValue="description" className={cn("w-full", className)}>
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto">
        <TabsTrigger
          value="description"
          className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
        >
          About the event
        </TabsTrigger>
        <TabsTrigger
          value="feed"
          className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
        >
          News feed
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
