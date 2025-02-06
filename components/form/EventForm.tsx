import { UseFormReturn } from "react-hook-form";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { GeoSearchControl } from "leaflet-geosearch";
import OpenStreetMapProvider from "leaflet-geosearch/lib/providers/openStreetMapProvider.js";
import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Skeleton } from "../shadcn/skeleton";
import { Card } from "../cards/Card";
import { Separator } from "../common/Separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs";
import { MarkdownPreview } from "../common/MarkdownPreview";
import { ButtonWithLabel } from "../buttons/ButtonWithLabel";
import { SmallText } from "../texts/SmallText";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { EventFormSchemaType, urlPattern } from "./types";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import { Form } from "@/components/shadcn/form";
import { isValidURL } from "@/lib/utils";
import "leaflet/dist/leaflet.css";
import "leaflet-geosearch/dist/geosearch.css";

interface EventFormProps {
  form: UseFormReturn<EventFormSchemaType>;
  onSubmit: (values: EventFormSchemaType) => Promise<void>;
  isLoaded: boolean;
  isEditing?: boolean;
}

const SearchField = () => {
  const map = useMap();
  const provider = new OpenStreetMapProvider();

  // @ts-expect-error any-type
  const searchControl = new GeoSearchControl({
    provider,
    marker: {
      icon: new L.Icon.Default(),
      draggable: false,
    },
    classNames: {
      input: "bg-[#FFF] text-[#000]",
      item: "text-[#000]",
    },
  });

  useEffect(() => {
    map.addControl(searchControl);
    return () => {
      map.removeControl(searchControl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
};

export const EventForm: React.FC<EventFormProps> = ({
  form,
  onSubmit,
  isLoaded,
  isEditing = false,
}) => {
  const imageUri = form.watch("imageUri");
  const description = form.watch("description");
  const t = useTranslations("eventForm");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full sm:flex-row items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full gap-10">
          <div className="flex flex-col gap-4 w-full sm:w-2/5">
            {/* I'm obligate to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead)  */}
            {isValidURL(imageUri, urlPattern) &&
            !form.formState.errors.imageUri?.message ? (
              <Image
                src={imageUri}
                width={330}
                height={330}
                alt="imageUri"
                className="flex w-full rounded-xl self-center"
              />
            ) : (
              <Skeleton className="w-full h-[330px] rounded-xnter" />
            )}
            <Card>
              <FormFieldInputString
                control={form.control}
                name="imageUri"
                placeholder={t("image-uri-placeholder")}
              />
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
            <Card>
              <FormFieldInputString
                control={form.control}
                name="location"
                placeholder={t("location-placeholder")}
              />
            </Card>
            <MapContainer
              center={[51.505, -0.09]}
              zoom={3}
              className="h-[300px] w-full "
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <SearchField />
            </MapContainer>
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
              />
              <Separator className="mx-0" />
              <FormFieldDatePicker
                form={form}
                name="endDate"
                placeholder={t("end-date-placeholder")}
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
