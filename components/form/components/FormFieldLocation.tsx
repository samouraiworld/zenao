"use client";

import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { z } from "zod";
import OpenStreetMapProvider from "leaflet-geosearch/lib/providers/openStreetMapProvider.js";
import { SearchResult } from "leaflet-geosearch/dist/providers/provider.js";
import { addressLocationSchema, EventFormSchemaType } from "../types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { Button } from "@/components/shadcn/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
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
import { cn } from "@/lib/tailwind";
import { currentTimezone } from "@/lib/time";
import Text from "@/components/texts/text";

export const useSearchField = (value: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    // Created a timeout else we query too many times the provider and it takes too much time to process
    const timeoutId = setTimeout(async () => {
      const provider = new OpenStreetMapProvider();
      setLoading(true);
      const results = await provider.search({ query: value });

      setResults(results);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  return { loading, results };
};

export const FormFieldLocation: React.FC<{
  form: UseFormReturn<EventFormSchemaType>;
  onSelect: (marker: { lat: number; lng: number }) => Promise<void>;
  onRemove: () => void;
}> = ({ form, onSelect, onRemove }) => {
  const t = useTranslations("eventForm");
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const { results } = useSearchField(search);

  return (
    <FormField
      control={form.control}
      name="location"
      render={({ field }) => {
        const object = field.value as z.infer<typeof addressLocationSchema>;
        return (
          <FormItem className="flex flex-col w-full space-y-0">
            <Popover open={open} onOpenChange={setOpen}>
              <div className="flex flex-row w-full justify-between">
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="secondary"
                      role="combobox"
                      className="w-full flex justify-start rounded-xl px-4 py-3 h-auto backdrop-blur-sm"
                    >
                      <Text
                        size="sm"
                        className={cn(
                          "truncate",
                          !object.address && "text-secondary-color",
                        )}
                      >
                        {object.address || "Add an address..."}
                      </Text>
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                {object.address && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="bg-secondary/80 backdrop-blur-sm self-center absolute right-1"
                    onClick={() => {
                      setSearch("");
                      onRemove();
                      form.setValue("location", {
                        ...object,
                        address: "",
                      });
                    }}
                  >
                    <XIcon className="h-3 w-3" />
                    <span className="sr-only">Clear</span>
                  </Button>
                )}
              </div>
              <PopoverContent className="max-w-full relative p-0">
                <Command>
                  <CommandInput
                    placeholder={t("location-placeholder")}
                    className="h-10"
                    onValueChange={setSearch}
                    value={search}
                    typeof="search"
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        form.setValue("location", {
                          ...object,
                          address: search,
                        });
                        setOpen(false);
                      }
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>No address found.</CommandEmpty>
                    <CommandGroup>
                      {results.map((result, index) => (
                        <CommandItem
                          className="text-primary"
                          value={result.label}
                          key={result.label + index}
                          onSelect={async () => {
                            const lat = Number(result.raw.lat);
                            const lng = Number(result.raw.lon);
                            form.setValue("location", {
                              kind: "geo",
                              address: result.label,
                              lat,
                              lng,
                              size: 0,
                            });
                            await onSelect({ lat, lng });
                            setOpen(false);
                          }}
                        >
                          <Text size="sm">{result.label}</Text>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                    {/* Use custom location */}
                    {search && (
                      <CommandItem
                        className="text-primary p-2 m-1"
                        value={search}
                        key={search}
                        onSelect={async () => {
                          form.setValue("location", {
                            kind: "custom",
                            address: search,
                            timeZone: currentTimezone(),
                          });
                          onRemove();
                          setOpen(false);
                        }}
                      >
                        <Text size="sm">{`Use ${search}`}</Text>
                      </CommandItem>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
