"use client";

import { useQueryState } from "nuqs";
import React, { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { Label } from "@/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import EventsTable from "@/components/features/dashboard/home/events-table";
import Heading from "@/components/widgets/texts/heading";

interface EventsTableProps {
  now: number;
}

export default function EventsPageLayout({ now }: EventsTableProps) {
  const router = useRouter();
  const [tab] = useQueryState<"upcoming" | "past">("tab", {
    defaultValue: "upcoming",
    parse: (value) =>
      value === "upcoming" || value === "past" ? value : "upcoming",
  });

  return (
    <div className="flex flex-col gap-6">
      <Heading level={1} className="text-2xl">
        Events
      </Heading>

      <div className="flex flex-col gap-4">
        <Tabs
          defaultValue="upcoming"
          value={tab}
          className="w-full flex-col justify-start gap-6"
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="view-selector" className="sr-only">
              View
            </Label>
            <Select
              defaultValue="upcoming"
              value={tab}
              onValueChange={(value) => {
                router.push(`/dashboard?tab=${value}`);
              }}
            >
              <SelectTrigger
                className="flex w-fit xl:hidden"
                id="view-selector"
              >
                <SelectValue placeholder="Select a view" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="past">Past</SelectItem>
              </SelectContent>
            </Select>
            <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 xl:flex">
              <Link href="/dashboard?tab=upcoming">
                <TabsTrigger value="upcoming" className="gap-2">
                  Upcoming
                </TabsTrigger>
              </Link>
              <Link href="/dashboard?tab=past">
                <TabsTrigger value="past" className="gap-2">
                  Past
                </TabsTrigger>
              </Link>
            </TabsList>
            {/* <div className="flex items-center gap-2">
              <DataTableViewOptions table={table} />
            </div> */}
          </div>

          <Suspense fallback={<div>Loading events...</div>}>
            <EventsTable now={now} tab={tab} />
          </Suspense>
        </Tabs>
      </div>
    </div>
  );
}
