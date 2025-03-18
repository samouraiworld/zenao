"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
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
import Text from "@/components/texts/text";

export const TimeZonesPopover: React.FC<{
  handleSelect: (timeZone: string) => void;
  defaultValue: string;
}> = ({ handleSelect, defaultValue }) => {
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [item, setItem] = useState<string>(defaultValue || "");

  return (
    <div>
      <Text size="sm">
        You choose a custom location, so please select a timezone.
      </Text>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="relative" asChild>
          <ButtonWithChildren>
            <Text size="sm" variant="invert">
              {(timezones && item) || "Select timezone..."}
            </Text>
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
                      <Text size="sm">{timezone}</Text>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};
