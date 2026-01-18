import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { EventFormSchemaType } from "@/types/schemas";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { eventImageAspectRatio } from "@/components/features/event/event-image";
import { IMAGE_FILE_SIZE_LIMIT } from "@/components/features/event/constants";
import Text from "@/components/widgets/texts/text";

export default function DashboardFormImage() {
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("eventForm");

  const imageUri = form.watch("imageUri");

  return (
    <FormFieldImage
      name="imageUri"
      control={form.control}
      placeholder={t("image-uri-placeholder")}
      aspectRatio={eventImageAspectRatio}
      fileSizeLimitMb={IMAGE_FILE_SIZE_LIMIT}
      tooltip={imageUri ? <Text>{t("change-image")}</Text> : null}
      fit="pad"
    />
  );
}
