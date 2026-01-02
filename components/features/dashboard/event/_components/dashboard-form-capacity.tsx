import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { EventFormSchemaType } from "@/types/schemas";
import { FormFieldInputNumber } from "@/components/widgets/form/form-field-input-number";

export default function DashboardFormCapacity() {
  const t = useTranslations("eventForm");
  const form = useFormContext<EventFormSchemaType>();

  return (
    <FormFieldInputNumber
      control={form.control}
      name="capacity"
      placeholder={t("capacity-placeholder")}
      label={t("capacity-label")}
    />
  );
}
