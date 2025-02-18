import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { find as GeoTZFind } from "browser-geo-tz";
import L from "leaflet";
import { Card } from "../cards/Card";
import { Separator } from "../common/Separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs";
import { MarkdownPreview } from "../common/MarkdownPreview";
import { ButtonWithLabel } from "../buttons/ButtonWithLabel";
import { SmallText } from "../texts/SmallText";
import { Switch } from "../shadcn/switch";
import { Label } from "../shadcn/label";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { TimeZonesPopover } from "./components/TimeZonesPopover";
import { FormFieldImage } from "./components/FormFieldImage";
import { EventFormSchemaType } from "./types";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import { FormFieldLocation } from "./components/FormFieldLocation";
import { Form } from "@/components/shadcn/form";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";
import { Map } from "@/components/common/Map";
import { currentTimezone } from "@/lib/time";

interface EventFormProps {
  form: UseFormReturn<EventFormSchemaType>;
  onSubmit: (values: EventFormSchemaType) => Promise<void>;
  isLoaded: boolean;
  isEditing?: boolean;
}

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
                  if (checked) {
                    form.setValue("location", {
                      kind: "virtual",
                      location: "",
                    });
                  } else {
                    form.setValue("location", {
                      kind: "custom",
                      address: "",
                      timeZone: "",
                    });
                  }
                  setMarker(null);
                  setTimeZone("");
                  setIsVirtual(checked);
                }}
              />
              <Label htmlFor="virtual">Online event</Label>
            </div>
            <Card className={isVirtual ? "" : "p-0"}>
              {isVirtual && location.kind === "virtual" ? (
                <FormFieldInputString
                  control={form.control}
                  name="location.location"
                  placeholder={"URI..."}
                />
              ) : (
                <FormFieldLocation
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
                defaultValue={currentTimezone()}
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
