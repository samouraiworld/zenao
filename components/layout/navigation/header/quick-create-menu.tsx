"use client";

import { Calendar, PlusIcon, Users } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Button } from "@/components/shadcn/button";

export default function QuickCreateMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="quick menu create"
          className="border-[#EC7E17] hover:bg-[#EC7E17] text-[#EC7E17] focus-visible:ring-0"
        >
          <PlusIcon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
          <span className="sr-only">Create</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Link href="/event/create">
          <DropdownMenuItem>
            <div className="flex">
              <Calendar className="mr-2 h-5 w-5" />
              <span className="mr-2">Create new event</span>
            </div>
          </DropdownMenuItem>
        </Link>
        <Link href="/community/create">
          <DropdownMenuItem asChild>
            <div className="flex">
              <Users className="h-5 w-5" />
              <span className="mr-2">Create new community</span>
            </div>
          </DropdownMenuItem>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
