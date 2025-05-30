"use client";

import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Command as CommandPrimitive } from "cmdk";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { XIcon } from "lucide-react";
import { z } from "zod";
import OpenStreetMapProvider from "leaflet-geosearch/lib/providers/openStreetMapProvider.js";
import { SearchResult } from "leaflet-geosearch/dist/providers/provider.js";
import { addressLocationSchema, EventFormSchemaType } from "../types";
import { Button } from "@/components/shadcn/button";
import { FormField, FormItem, FormMessage } from "@/components/shadcn/form";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import {
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

type LocationOption = {
  id: number;
  label: string;
  value: SearchResult;
};

export const FormFieldLocation: React.FC<{
  form: UseFormReturn<EventFormSchemaType>;
  onSelect?: (marker: { lat: number; lng: number }) => Promise<void>;
  onRemove: () => void;
}> = ({ form, onSelect, onRemove }) => {
  const t = useTranslations("eventForm");
  const [search, setSearch] = useState<string>(() => {
    const loc = form.getValues().location;
    switch (loc.kind) {
      case "custom":
      case "geo":
        return loc.address;
      default:
        return "";
    }
  });
  const { results, loading } = useSearchField(search);

  const options = useMemo(() => {
    if (loading) return [];

    return results.map((result) => ({
      id: (result.raw as NominatimSearchResult).place_id,
      label: result.label,
      value: result,
    }));
  }, [results, loading]);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [selected, setSelected] = useState<{
    value: SearchResult;
    label: string;
  }>();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const input = inputRef.current;
      if (!input) {
        return;
      }

      if (!isOpen) {
        setOpen(true);
      }

      if (event.key === "Escape") {
        input.blur();
      }
    },
    [isOpen],
  );

  const handleBlur = useCallback(() => {
    setOpen(false);
    if (form.getValues().location.kind !== "custom") {
      setSearch(selected?.label ?? "");
    }
  }, [selected, form]);

  const handleSelectOption = useCallback(
    async (selectedOption: LocationOption) => {
      setSearch(selectedOption.label);
      setSelected(selectedOption);

      const lat = Number(selectedOption.value.y);
      const lng = Number(selectedOption.value.x);
      form.setValue("location", {
        kind: "geo",
        address: formatAddress(selectedOption.value.raw),
        lat,
        lng,
        size: 0,
      });
      form.trigger("location");
      if (onSelect) await onSelect({ lat, lng });

      // This is a hack to prevent the input from being focused after the user selects an option
      // We can call this hack: "The next tick"
      setTimeout(() => {
        inputRef?.current?.blur();
      }, 0);
    },
    [onSelect, form],
  );

  return (
    <FormField
      control={form.control}
      name="location"
      render={({ field }) => {
        const object = field.value as z.infer<typeof addressLocationSchema>;
        return (
          <FormItem className="flex flex-col w-full gap-0">
            <CommandPrimitive onKeyDown={handleKeyDown} shouldFilter={false}>
              <div className="relative">
                <CommandInput
                  ref={inputRef}
                  value={search}
                  typeof="search"
                  onValueChange={setSearch}
                  onBlur={handleBlur}
                  onFocus={() => setOpen(true)}
                  placeholder={t("location-placeholder")}
                  className="!h-12 px-4 text-base rounded bg-custom-input-bg border border-custom-input-border"
                  containerClassName="border-none p-0"
                />
                {object.address && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="backdrop-blur-sm self-center absolute top-1/2 -translate-y-1/2 right-1"
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
              <div className={cn("relative", isOpen && "mt-1")}>
                <div
                  className={cn(
                    "animate-in fade-in-0 zoom-in-95 absolute top-0 z-50 w-full rounded-md bg-popover border text-popover-foreground outline-none",
                    isOpen ? "block" : "hidden",
                  )}
                >
                  <CommandList className="rounded-lg">
                    <CommandGroup>
                      {options.map((option) => {
                        return (
                          <CommandItem
                            key={option.id}
                            value={option.label}
                            onMouseDown={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                            }}
                            onSelect={async () =>
                              await handleSelectOption(option)
                            }
                            className={cn("flex w-full items-center gap-2")}
                          >
                            {option.label}
                          </CommandItem>
                        );
                      })}
                      {!loading ? (
                        <CommandPrimitive.Empty className="select-none rounded-sm px-2 py-3 text-center text-sm">
                          {t("no-address-found")}
                        </CommandPrimitive.Empty>
                      ) : null}
                    </CommandGroup>
                    <CommandGroup>
                      {search && (
                        <CommandItem
                          className="text-primary"
                          value={search}
                          onMouseDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                          }}
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
                    </CommandGroup>
                  </CommandList>
                </div>
              </div>
            </CommandPrimitive>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
