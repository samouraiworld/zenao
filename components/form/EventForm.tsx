import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Card } from "../cards/Card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../shadcn/tabs";
import { MarkdownPreview } from "../common/MarkdownPreview";
import { ButtonWithLabel } from "../buttons/ButtonWithLabel";
import { SmallText } from "../texts/SmallText";
import { Separator } from "../shadcn/separator";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { EventFormSchemaType } from "./types";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import { FormFieldImage } from "./components/FormFieldImage";
import { Form } from "@/components/shadcn/form";

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
  const t = useTranslations("eventForm");

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
            <Card>
              <FormFieldInputString
                control={form.control}
                name="location"
                placeholder={t("location-placeholder")}
              />
            </Card>
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
              />
              <Separator className="mx-0" />
              <FormFieldDatePicker
                name="endDate"
                control={form.control}
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
