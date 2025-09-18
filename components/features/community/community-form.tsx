"use client";

import React from "react";
import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Trash2Icon } from "lucide-react";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { Button } from "@/components/shadcn/button";
import { CommunityFormSchemaType } from "@/types/schemas";
import { cn } from "@/lib/tailwind";

interface CommunityFormProps {
  form: UseFormReturn<CommunityFormSchemaType>;
  onSubmit: (values: CommunityFormSchemaType) => Promise<void>;
  isLoading: boolean;
}

export const CommunityForm: React.FC<CommunityFormProps> = ({
  form,
  onSubmit,
  isLoading,
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "administrators",
  });

  const adminInputs = useWatch({
    control: form.control,
    name: "administrators",
  });

  const lastAdminInput =
    !adminInputs?.length || !adminInputs[adminInputs.length - 1]?.address;

  const isButtonDisabled = !form.formState.isValid || lastAdminInput;
  const t = useTranslations("community-edit-form");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full gap-10"
      >
        <div className="flex flex-col gap-6 w-1/3">
          <FormFieldImage
            name="avatarUri"
            control={form.control}
            aspectRatio={1}
            placeholder={t("upload-avatar")}
            className="w-full"
          />
          <FormFieldImage
            name="bannerUri"
            control={form.control}
            aspectRatio={1.9}
            placeholder={t("upload-banner")}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-6 w-2/3">
          <FormFieldInputString
            control={form.control}
            name="displayName"
            label={t("name-label")}
            placeholder={t("name-placeholder")}
          />
          <FormFieldTextArea
            control={form.control}
            name="description"
            label={t("description-label")}
            placeholder={t("description-placeholder")}
            wordCounter
            maxLength={5000}
          />

          <div className="flex flex-col gap-4">
            <label className="block text-sm font-medium">
              {t("admin-label")}
            </label>

            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <FormFieldInputString
                    control={form.control}
                    name={`administrators.${index}.address`}
                    placeholder={t("admin-placeholder")}
                    className="flex-grow"
                  />

                  <div
                    onClick={() => {
                      if (fields.length > 1) remove(index);
                    }}
                    className={cn(
                      "hover:cursor-pointer flex items-center justify-center rounded-full size-11 aspect-square",
                      fields.length > 1
                        ? "hover:bg-destructive"
                        : "opacity-30 cursor-not-allowed",
                    )}
                  >
                    <Trash2Icon className="size-4" />
                  </div>
                </div>
              ))}

              <Button
                type="button"
                onClick={() => append({ address: "" })}
                className="w-fit"
                disabled={lastAdminInput}
              >
                {t("add-admin")}
              </Button>
            </div>
          </div>

          <ButtonWithChildren
            loading={isLoading}
            disabled={isButtonDisabled}
            type="submit"
          >
            {t("submit")}
          </ButtonWithChildren>
        </div>
      </form>
    </Form>
  );
};
