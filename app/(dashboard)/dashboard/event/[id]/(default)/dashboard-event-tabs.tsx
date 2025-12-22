"use client";

import { Tabs, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { TabsContent } from "@/components/shadcn/tabs";
import { Separator } from "@/components/shadcn/separator";
import { Badge } from "@/components/shadcn/badge";

export default function DashboardEventTabs({
  eventId,
  children,
  nbParticipants,
}: {
  eventId: string;
  children: React.ReactNode;
  nbParticipants: number;
}) {
  const section = useSelectedLayoutSegment() || "description";

  return (
    <Tabs value={section} className="w-full min-h-[300px]">
      <TabsList className="flex w-full bg-transparent p-0 m-0 overflow-auto justify-start">
        <Link href={`/dashboard/event/${eventId}`} scroll={false}>
          <TabsTrigger
            value="description"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            Description
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/event/${eventId}/participants`} scroll={false}>
          <TabsTrigger
            value="participants"
            className="w-fit flex gap-2 p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            Participants <Badge variant="secondary">{nbParticipants}</Badge>
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/event/${eventId}/gatekeepers`} scroll={false}>
          <TabsTrigger
            value="gatekeepers"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            Gatekeepers
          </TabsTrigger>
        </Link>
        <Link href={`/dashboard/event/${eventId}/broadcast`} scroll={false}>
          <TabsTrigger
            value="broadcast"
            className="w-fit p-2 data-[state=active]:font-semibold hover:bg-secondary/80"
          >
            Broadcast
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
