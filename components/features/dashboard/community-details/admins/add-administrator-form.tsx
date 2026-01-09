"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, EmailSchemaType } from "@/types/schemas";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { Button } from "@/components/shadcn/button";
import { useCommunityAdministratorsEditionContext } from "@/components/providers/community-administrators-edition-context-provider";

export function AddAdministratorsForm() {
  const t = useTranslations(
    "dashboard.communityDetails.administrators.add-administrator-form",
  );
  const { administrators, onAdd, isActionPending } =
    useCommunityAdministratorsEditionContext();

  const {
    handleSubmit,
    control,
    reset,
    formState: { isValid, isDirty, ...formState },
    ...rest
  } = useForm<EmailSchemaType>({
    mode: "all",
    resolver: zodResolver(
      emailSchema.refine((data) => !administrators.includes(data.email), {
        message: t("error-administrator-already-exists"),
        path: ["email"],
      }),
    ),
    defaultValues: { email: "" },
  });

  const onSubmit = (newGatekeeper: EmailSchemaType) => {
    onAdd(newGatekeeper.email);
    reset();
  };

  return (
    <Form
      {...{
        control,
        reset,
        handleSubmit,
        formState: { isDirty, isValid, ...formState },
        ...rest,
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-2 items-baseline">
          <FormFieldInputString
            control={control}
            name="email"
            placeholder={t("email-placeholder")}
            className="w-96"
          />
          <Button
            type="submit"
            disabled={isActionPending || !isDirty || !isValid}
            className="h-12"
          >
            {t("add-btn")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
