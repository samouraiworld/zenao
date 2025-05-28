"use client";

import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { z } from "zod";
import { OpenStreetMapProvider } from "leaflet-geosearch";
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

export interface NominatimSearchResult {
  place_id: number;
  licence: string;
  osm_type: "node" | "way" | "relation";
  osm_id: number;
  boundingbox: [string, string, string, string];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address?: AddressDetails;
  extratags?: Record<string, string>;
  namedetails?: Record<string, string>;
}

export interface AddressDetails {
  // Basic levels
  continent?: string;
  country?: string;
  country_code?: string;

  // Administrative regions
  region?: string;
  state?: string;
  state_district?: string;
  county?: string;
  municipality?: string;

  // Settlements
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  croft?: string;
  isolated_dwelling?: string;

  // Subdivisions
  city_district?: string;
  district?: string;
  borough?: string;
  suburb?: string;
  subdivision?: string;
  neighbourhood?: string;
  allotments?: string;
  quarter?: string;

  // Urban blocks
  city_block?: string;
  residential?: string;
  farm?: string;
  farmyard?: string;
  industrial?: string;
  commercial?: string;
  retail?: string;

  // Address specifics
  road?: string;
  house_number?: string;
  house_name?: string;

  // Misc OSM tags
  emergency?: string;
  historic?: string;
  military?: string;
  natural?: string;
  landuse?: string;
  place?: string;
  railway?: string;
  man_made?: string;
  aerialway?: string;
  boundary?: string;
  amenity?: string;
  aeroway?: string;
  club?: string;
  craft?: string;
  leisure?: string;
  office?: string;
  mountain_pass?: string;
  shop?: string;
  tourism?: string;
  bridge?: string;
  tunnel?: string;
  waterway?: string;

  // Postal
  postcode?: string;
}

const venueKeys = [
  "emergency",
  "historic",
  "military",
  "natural",
  "landuse",
  "place",
  "railway",
  "man_made",
  "aerialway",
  "boundary",
  "amenity",
  "aeroway",
  "club",
  "craft",
  "leisure",
  "office",
  "mountain_pass",
  "shop",
  "tourism",
  "bridge",
  "tunnel",
  "waterway",
] as const;

type VenueKey = (typeof venueKeys)[number];

export function formatAddress(result: NominatimSearchResult): string {
  const address = result.address ?? {};
  const className = result.class;

  // Try to determine venue name based on class and fallback keys
  const venueName: string | undefined = ((): string | undefined => {
    if (className && address[className as VenueKey]) {
      return address[className as VenueKey];
    }
    for (const key of venueKeys) {
      if (address[key]) return address[key];
    }
    return undefined;
  })();

  const { house_number, road, postcode, city, town, village, country } =
    address;

  const cityLevel = city || town || village;

  const parts = [
    venueName,
    [
      [house_number, road].filter(Boolean).join(" "),
      [postcode, cityLevel].filter(Boolean).join(" "),
      country,
    ]
      .filter(Boolean)
      .join(", "),
  ].filter(Boolean);

  return parts.join(" - ");
}

export const useSearchField = (value: string) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    // Created a timeout else we query too many times the provider and it takes too much time to process
    const timeoutId = setTimeout(async () => {
      const provider = new OpenStreetMapProvider({
        params: {
          addressdetails: 1,
        },
      });
      setLoading(true);
      // const pro
      const results = await provider.search({
        query: value,
      });
      setResults(results);
      setLoading(false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [value]);

  return { loading, results };
};

export const FormFieldLocation: React.FC<{
  form: UseFormReturn<EventFormSchemaType>;
  onSelect?: (marker: { lat: number; lng: number }) => Promise<void>;
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
          <FormItem className="flex flex-col w-full gap-0">
            <Popover open={open} onOpenChange={setOpen}>
              <div className="flex flex-row w-full relative">
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="input"
                      role="combobox"
                      className="w-full flex justify-start px-4 py-3 h-auto backdrop-blur-sm"
                    >
                      <Text
                        className={cn(
                          "text-base truncate",
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
                    className="backdrop-blur-sm self-center absolute right-1"
                    onClick={() => {
                      setSearch("");
                      form.setValue("location", {
                        kind: "custom",
                        address: "",
                        timeZone: currentTimezone(),
                      });
                      onRemove();
                      form.trigger("location");
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
                        form.trigger("location");
                        setOpen(false);
                      }
                    }}
                  />
                  <CommandList>
                    <CommandEmpty>No address found.</CommandEmpty>
                    <CommandGroup>
                      {results.map((result, index) => {
                        const address = formatAddress(
                          result.raw as NominatimSearchResult,
                        );
                        return (
                          <CommandItem
                            className="text-primary"
                            value={result.label}
                            key={result.label + index}
                            onSelect={async () => {
                              const lat = Number(result.raw.lat);
                              const lng = Number(result.raw.lon);
                              form.setValue("location", {
                                kind: "geo",
                                address,
                                lat,
                                lng,
                                size: 0,
                              });
                              form.trigger("location");
                              if (onSelect) await onSelect({ lat, lng });
                              setOpen(false);
                            }}
                          >
                            <Text className="md:text-sm">{address}</Text>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    {/* Use custom location */}
                    {search && (
                      <CommandItem
                        className="text-primary p-2 m-1"
                        value={search}
                        key={search}
                        onSelect={async () => {
                          onRemove();
                          form.setValue("location", {
                            kind: "custom",
                            address: search,
                            timeZone: currentTimezone(),
                          });
                          form.trigger("location");
                          setOpen(false);
                        }}
                      >
                        <Text className="md:text-sm">{`Use ${search}`}</Text>
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
