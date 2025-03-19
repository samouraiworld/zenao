"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
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
import { Button } from "@/components/shadcn/button";

export const TimeZonesPopover: React.FC<{
  handleSelect: (timeZone: string) => void;
  defaultValue: string;
}> = ({ handleSelect, defaultValue }) => {
  const t = useTranslations("eventForm");
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [item, setItem] = useState<string>(defaultValue || "");

  return (
    <div className="flex flex-col gap-2">
      <Text size="sm">{t("custom-timezone-select")}</Text>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="relative" asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[250px] justify-between"
          >
            {(timezones && item) || "Select timezone..."}
            <ChevronsUpDown className="opacity-50" />
          </Button>
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
              <CommandEmpty>{t("no-timezone-found")}</CommandEmpty>
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
