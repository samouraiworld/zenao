"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { ButtonWithChildren } from "@/components/buttons/button-with-children";
import { SmallText } from "@/components/texts/small-text";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/shadcn/command";
import { timezones } from "@/lib/timezones";

export function TimeZonesPopover({
  handleSelect,
  defaultValue,
}: {
  handleSelect: (timeZone: string) => void;
  defaultValue: string;
}) {
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [item, setItem] = useState<string>(defaultValue || "");

  return (
    <div>
      <SmallText>
        You choose a custom location, so please select a timezone.
      </SmallText>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="relative" asChild>
          <ButtonWithChildren>
            <SmallText variant="invert">
              {(timezones && item) || "Select timezone..."}
            </SmallText>
          </ButtonWithChildren>
        </PopoverTrigger>
        <PopoverContent className="w-full relative p-0">
          <Command>
            <CommandInput
              placeholder="Timezones"
              className="h-10"
              onValueChange={setSearch}
              value={search}
              typeof="search"
            />
            <CommandList>
              <CommandEmpty>No timezones found.</CommandEmpty>
              <CommandGroup>
                {timezones &&
                  timezones?.map((timezone, index) => (
                    <CommandItem
                      className="text-primary"
                      value={timezone}
                      key={timezone + index}
                      onSelect={() => {
                        setItem(timezone);
                        handleSelect(timezone);
                        setOpen(false);
                      }}
                    >
                      <SmallText>{timezone}</SmallText>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
