import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { EventFormSchemaType } from "@/types/schemas";
import { cn } from "@/lib/tailwind";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";

export default function DashboardFormTitle() {
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("eventForm");

  return (
    <FormFieldTextArea
      control={form.control}
      name="title"
      className={cn(
        "font-semibold text-3xl overflow-hidden bg-transparent",
        "focus-visible:ring-transparent w-full placeholder:text-secondary-color",
      )}
      rows={1}
      placeholder={t("title-placeholder")}
      maxLength={140}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          // method to prevent from default behaviour
          e.preventDefault();
        }
      }}
      wordCounter
      wordCounterPosition="left"
    />
  );
}
