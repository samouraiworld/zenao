"use client";

import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { InviteeForm } from "./invitee-form";
import { EventRegistrationFormSchemaType } from "@/components/features/event/event-registration/index";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";

type FreeRegistrationFormProps = {
  isPending: boolean;
  requireEmail: boolean;
  userId?: string | null;
};

export function FreeRegistrationForm({
  isPending,
  requireEmail,
  userId,
}: FreeRegistrationFormProps) {
  const t = useTranslations("event");
  const { control } = useFormContext<EventRegistrationFormSchemaType>();

  return (
    <div className="flex flex-col gap-4">
      {requireEmail && (
        <FormFieldInputString
          control={control}
          disabled={isPending}
          name="email"
          label={t("your-email")}
          placeholder={t("email-placeholder")}
        />
      )}
      <InviteeForm userId={userId} loading={isPending} />
      <ButtonWithChildren loading={isPending} type="submit">
        {t("register-button")}
      </ButtonWithChildren>
    </div>
  );
}
