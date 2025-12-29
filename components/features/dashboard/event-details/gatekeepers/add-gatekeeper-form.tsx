"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailSchema, EmailSchemaType } from "@/types/schemas";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { Button } from "@/components/shadcn/button";
import { useGatekeepersEdition } from "@/app/(dashboard)/dashboard/event/[id]/(default)/gatekeepers/gatekeepers-edition-context-provider";

export function AddGatekeeperForm() {
  const t = useTranslations(
    "dashboard.eventDetails.gatekeepers.add-gatekeeper-form",
  );
  const { gatekeepers, onAdd, isActionPending } = useGatekeepersEdition();

  const {
    handleSubmit,
    control,
    reset,
    formState: { isValid, isDirty, ...formState },
    ...rest
  } = useForm<EmailSchemaType>({
    mode: "all",
    resolver: zodResolver(
      emailSchema.refine((data) => !gatekeepers.includes(data.email), {
        message: t("error-gatekeeper-already-exists"),
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
