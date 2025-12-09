"use client";

import { CircleX, EllipsisVertical, PencilIcon } from "lucide-react";
import Link from "next/link";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";

interface DashboardEventHeaderProps {
  eventId: string;
  eventInfo: EventInfo;
}

export default function DashboardEventHeader({
  eventId,
  eventInfo,
}: DashboardEventHeaderProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        {/* Title of the event */}
        <Heading level={1} size="3xl">
          Event: {eventInfo.title}
        </Heading>

        {/* Actions dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Text className="hidden md:flex">Actions</Text>
              <EllipsisVertical />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-48 space-y-1 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/event/${eventId}/edit`}>
                  <PencilIcon />
                  Edit
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CircleX />
              Cancel event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
