"use client";

import { useFormContext } from "react-hook-form";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { EventFormSchemaType } from "@/types/schemas";
import { FormFieldSwitch } from "@/components/widgets/form/form-field-switch";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";

export function DashboardFormPrivacy() {
  const defaultExclusive =
    useFormContext<EventFormSchemaType>().formState.defaultValues?.exclusive;
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("eventForm");

  const exclusive = form.watch("exclusive");
  const discoverable = form.watch("discoverable");

  useEffect(() => {
    if (!exclusive) {
      form.setValue("password", "");
    } else {
      form.setValue("password", undefined);
    }
  }, [exclusive, form]);

  return (
    <div className="flex flex-col gap-6">
      {/* Private option */}
      <FormFieldSwitch
        control={form.control}
        name="exclusive"
        label={"Protect access with password"}
      />

      {exclusive && (
        <FormFieldInputString
          control={form.control}
          name="password"
          inputType="password"
          placeholder={
            defaultExclusive
              ? t("no-changes-password-placeholder")
              : t("password-placeholder")
          }
          label={t("password-label")}
        />
      )}

      {/* Includes the event in listEventsInternal (eventreg.gno) if true */}
      <div className="flex items-center gap-2">
        <FormFieldSwitch
          control={form.control}
          name="discoverable"
          label={t("discoverable-label")}
        />
        {discoverable ? (
          <Eye className="size-5" />
        ) : (
          <EyeOff className="size-5" />
        )}
      </div>
    </div>
  );
}
