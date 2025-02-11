import { UseFormReturn } from "react-hook-form";
import Image from "next/image";
import { useTranslations } from "next-intl";
import OpenStreetMapProvider from "leaflet-geosearch/lib/providers/openStreetMapProvider.js";
import { useEffect, useRef, useState } from "react";
import { CloudUpload, Loader2, XIcon } from "lucide-react";
import { SearchResult } from "leaflet-geosearch/dist/providers/provider.js";
import { find as GeoTZFind } from "browser-geo-tz";
import L from "leaflet";
import { Skeleton } from "../shadcn/skeleton";
import { Card } from "../cards/Card";
import { Separator } from "../common/Separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "../shadcn/popover";
import { Button } from "../shadcn/button";
import { MarkdownPreview } from "../common/MarkdownPreview";
import { ButtonWithLabel } from "../buttons/ButtonWithLabel";
import { SmallText } from "../texts/SmallText";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { EventFormSchemaType, urlPattern } from "./types";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { useToast } from "@/app/hooks/use-toast";
import { isValidURL, web2URL } from "@/lib/uris";
import { filesPostResponseSchema } from "@/lib/files";
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
      render={({ field }) => (
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
                        !field.value.length && "text-secondary-color",
                      )}
                    >
                      {field.value || "Add an address..."}
                    </SmallText>
                  </Button>
                </FormControl>
              </PopoverTrigger>
              {field.value && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="bg-secondary/80 backdrop-blur-sm self-center absolute right-1"
                  onClick={() => {
                    setSearch("");
                    onRemove();
                    form.setValue("location", "");
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
                          form.setValue("location", result.label);
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
      )}
    />
  );
};

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  isLoaded,
  isEditing = false,
}) => {
  const imageUri = form.watch("imageUri");
  const description = form.watch("description");
  const location = form.watch("location");
  const t = useTranslations("eventForm");

  const [uploading, setUploading] = useState(false);
  const [marker, setMarker] = useState<L.LatLng | null>(null);
  const [timeZone, setTimeZone] = useState<string>("");

  const { toast } = useToast();
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    try {
      if (!file) {
        toast({
          variant: "destructive",
          title: "No file selected.",
        });
        return;
      }
      setUploading(true);
      const data = new FormData();
      data.set("file", file);
      const uploadRequest = await fetch("/api/files", {
        method: "POST",
        body: data,
      });
      const resRaw = await uploadRequest.json();
      const res = filesPostResponseSchema.parse(resRaw);
      form.setValue("imageUri", res.uri);
      setUploading(false);
    } catch (e) {
      console.error(e);
      setUploading(false);
      toast({
        variant: "destructive",
        title: "Trouble uploading file!",
      });
    }
  };

  const handleClick = () => {
    hiddenInputRef.current?.click();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full sm:flex-row items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full gap-10">
          <div className="flex flex-col gap-4 w-full sm:w-2/5">
            {/* We have to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead) */}
            {/* TODO: find a better way */}
            {isValidURL(imageUri, urlPattern) &&
            !form.formState.errors.imageUri?.message ? (
              <Image
                src={web2URL(imageUri)}
                width={330}
                height={330}
                alt="imageUri"
                className="flex w-full rounded-xl self-center"
              />
            ) : (
              <Skeleton className="w-full h-[330px] rounded-xnter flex justify-center items-center">
                {uploading && <Loader2 className="animate-spin" />}
              </Skeleton>
            )}
            <Card className="flex flex-row gap-3">
              <div className="w-full">
                <FormFieldInputString
                  control={form.control}
                  name="imageUri"
                  placeholder={t("image-uri-placeholder")}
                />
              </div>
              <div>
                <CloudUpload
                  onClick={handleClick}
                  className="w-5 cursor-pointer"
                />
                <input
                  type="file"
                  onChange={handleChange}
                  ref={hiddenInputRef}
                  className="hidden"
                  disabled={uploading}
                />
              </div>
            </Card>
          </div>
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
            <Card className="p-0">
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
            </Card>
            {timeZone && <SmallText className="mb-3">{timeZone}</SmallText>}
            {location && marker && <Map marker={marker} />}
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
                form={form}
                name="startDate"
                placeholder={t("start-date-placeholder")}
                timeZone={timeZone}
              />
              <Separator className="mx-0" />
              <FormFieldDatePicker
                form={form}
                name="endDate"
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
