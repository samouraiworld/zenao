import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import OpenStreetMapProvider from "leaflet-geosearch/lib/providers/openStreetMapProvider.js";
import { useEffect, useMemo, useState } from "react";
import { Check, XIcon } from "lucide-react";
import { SearchResult } from "leaflet-geosearch/dist/providers/provider.js";
import { find as GeoTZFind } from "browser-geo-tz";
import L from "leaflet";
import { z } from "zod";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card } from "../cards/Card";
import { Separator } from "../common/Separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Button } from "../shadcn/button";
import { MarkdownPreview } from "../common/MarkdownPreview";
import { ButtonWithLabel } from "../buttons/ButtonWithLabel";
import { ButtonWithChildren } from "../buttons/ButtonWithChildren";
import { SmallText } from "../texts/SmallText";
import { Switch } from "../shadcn/switch";
import { Label } from "../shadcn/label";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { FormFieldImage } from "./components/FormFieldImage";
import { addressLocationSchema, EventFormSchemaType } from "./types";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import {
  Form,
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
import { Map } from "@/components/common/Map";
import { timezoneOptions } from "@/lib/queries/event";

interface EventFormProps {
  form: UseFormReturn<EventFormSchemaType>;
  onSubmit: (values: EventFormSchemaType) => Promise<void>;
  isLoaded: boolean;
  isEditing?: boolean;
}

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

const FormFieldComboBox: React.FC<{
  form: UseFormReturn<EventFormSchemaType>;
  onSelect: (marker: L.LatLng) => Promise<void>;
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
                      <SmallText
                        className={cn(
                          "truncate",
                          !object.address && "text-secondary-color",
                        )}
                      >
                        {object.address || "Add an address..."}
                      </SmallText>
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
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        form.setValue("location", {
                          kind: "custom",
                          address: search,
                          timeZone: "",
                        });
                        setOpen(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-[2px] top-[2px]"
                    onClick={() => {
                      form.setValue("location", {
                        kind: "custom",
                        address: search,
                        timeZone: "",
                      });
                      onRemove();
                      setOpen(false);
                    }}
                  >
                    <Check className="h-3 w-3" />
                    <span className="sr-only">Select</span>
                  </Button>
                  <CommandList>
                    <CommandEmpty>No address found.</CommandEmpty>
                    <CommandGroup>
                      {results.map((result, index) => (
                        <CommandItem
                          className="text-primary"
                          value={result.label}
                          key={result.label + index}
                          onSelect={async () => {
                            form.setValue("location", {
                              kind: "geo",
                              address: result.label,
                              lat: result.raw.lat,
                              lng: result.raw.lon,
                              size: 0,
                            });
                            const latlng = new L.LatLng(
                              result.raw.lat,
                              result.raw.lon,
                            );
                            await onSelect(latlng);
                            setOpen(false);
                          }}
                        >
                          <SmallText>{result.label}</SmallText>
                        </CommandItem>
                      ))}
                    </CommandGroup>
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

const TimeZonesPopover: React.FC<{
  handleSelect: (timeZone: string) => void;
}> = ({ handleSelect }) => {
  const [search, setSearch] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [item, setItem] = useState<string>("");
  const { data: timezones } = useSuspenseQuery(timezoneOptions());

  return (
    <div>
      <SmallText>
        You choose a custom location, so please select a timezone.
      </SmallText>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger className="relative" asChild>
          <ButtonWithChildren>
            <SmallText variant="invert">
              {item || "Select timezone..."}
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
                {timezones.map((timezone, index) => (
                  <CommandItem
                    className="text-primary"
                    value={timezone}
                    key={timezone + index}
                    onSelect={() => {
                      setItem(timezone);
                      handleSelect(timezone);
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
};

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  isLoaded,
  isEditing = false,
}) => {
  const description = form.watch("description");
  const location = form.watch("location");
  const t = useTranslations("eventForm");

  const [isVirtual, setIsVirtual] = useState<boolean>(false);
  const [marker, setMarker] = useState<L.LatLng | null>(null);
  const isCustom = useMemo(() => !isVirtual && !marker, [isVirtual, marker]);
  const [timeZone, setTimeZone] = useState<string>("");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full sm:flex-row items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full gap-10">
          <FormFieldImage
            name="imageUri"
            control={form.control}
            placeholder={t("image-uri-placeholder")}
          />
          <div className="flex flex-col gap-4 w-full sm:w-3/5">
            <FormFieldTextArea
              control={form.control}
              name="title"
              className="font-semibold text-3xl overflow-hidden"
              placeholder={t("title-placeholder")}
              maxLength={140}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // method to prevent from default behaviour
                  e.preventDefault();
                }
              }}
            />
            <Card>
              <SmallText className="mb-3">{t("description-label")}</SmallText>
              <Tabs defaultValue="write" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="write">{t("write-tab")}</TabsTrigger>
                  <TabsTrigger value="preview">{t("preview-tab")}</TabsTrigger>
                </TabsList>
                <TabsContent value="write">
                  <FormFieldTextArea
                    control={form.control}
                    name="description"
                    placeholder={t("description-placeholder")}
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <MarkdownPreview markdownString={description} />
                </TabsContent>
              </Tabs>
            </Card>
            <div className="flex items-center gap-2">
              <Switch
                id="virtual"
                checked={isVirtual}
                onCheckedChange={(checked: boolean) => {
                  form.setValue("location", { kind: "virtual", location: "" });
                  setMarker(null);
                  setTimeZone("");
                  setIsVirtual(checked);
                }}
              />
              <Label htmlFor="virtual">Virtual address</Label>
            </div>
            <Card className={isVirtual ? "" : "p-0"}>
              {isVirtual && location.kind === "virtual" ? (
                <FormFieldInputString
                  control={form.control}
                  name="location.location"
                  placeholder={t("location-placeholder")}
                />
              ) : (
                <FormFieldComboBox
                  form={form}
                  onSelect={async (marker: L.LatLng) => {
                    setMarker(marker);
                    const tz = await GeoTZFind(marker.lat, marker.lng);
                    setTimeZone(tz[0]);
                  }}
                  onRemove={() => {
                    setMarker(null);
                    setTimeZone("");
                  }}
                />
              )}
            </Card>
            {!isVirtual && location && marker && <Map marker={marker} />}
            {isCustom && location.kind === "custom" && location.address && (
              <TimeZonesPopover
                handleSelect={(timeZone: string) => {
                  form.setValue("location", {
                    ...location,
                    timeZone,
                  });
                }}
              />
            )}
            <Card>
              <SmallText className="mb-3">{t("capacity-label")}</SmallText>
              <FormFieldInputNumber
                control={form.control}
                name="capacity"
                placeholder={t("capacity-placeholder")}
              />
            </Card>
            <Card className="flex flex-col gap-[10px]">
              <FormFieldDatePicker
                name="startDate"
                control={form.control}
                placeholder={t("start-date-placeholder")}
                timeZone={timeZone}
              />
              <Separator className="mx-0" />
              <FormFieldDatePicker
                name="endDate"
                control={form.control}
                placeholder={t("end-date-placeholder")}
                timeZone={timeZone}
              />
            </Card>
            <ButtonWithLabel
              loading={isLoaded}
              label={
                isEditing ? t("edit-event-button") : t("create-event-button")
              }
              type="submit"
            />
          </div>
        </div>
      </form>
    </Form>
  );
};
