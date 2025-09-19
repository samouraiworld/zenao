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
import { Card } from "@/components/widgets/cards/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import Text from "@/components/widgets/texts/text";
import { CommunityFormSchemaType } from "@/types/schemas";
import { cn } from "@/lib/tailwind";

interface CommunityFormProps {
  form: UseFormReturn<CommunityFormSchemaType>;
  onSubmit: (values: CommunityFormSchemaType) => Promise<void>;
  isLoading: boolean;
}

export const CommunityForm = ({
  form,
  onSubmit,
  isLoading,
}: CommunityFormProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "administrators",
  });

  const adminInputs = useWatch({
    control: form.control,
    name: "administrators",
  });

  const description = form.watch("description");
  const avatarUri = form.watch("avatarUri");
  const bannerUri = form.watch("bannerUri");

  const lastAdminInput =
    !adminInputs?.length || !adminInputs[adminInputs.length - 1]?.address;

  const isButtonDisabled = !form.formState.isValid || lastAdminInput;

  const t = useTranslations("community-edit-form");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col sm:flex-row sm:h-full gap-10"
      >
        <div className="flex flex-col w-full gap-10 md:gap-4">
          <FormFieldImage
            name="avatarUri"
            control={form.control}
            placeholder={t("upload-avatar")}
            tooltip={avatarUri ? <Text>{t("change-avatar")}</Text> : null}
            className="w-40 h-40 overflow-hidden"
          />
          <FormFieldImage
            name="bannerUri"
            control={form.control}
            aspectRatio={1.9}
            placeholder={t("upload-banner")}
            tooltip={bannerUri ? <Text>{t("change-banner")}</Text> : null}
          />
        </div>

        <div className="flex flex-col gap-6 w-full">
          <FormFieldTextArea
            control={form.control}
            name="displayName"
            className={cn(
              "font-semibold text-3xl overflow-hidden bg-transparent",
              "border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
            )}
            placeholder={t("name-placeholder")}
            maxLength={140}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
              }
            }}
            wordCounter
          />

          <Card className="rounded px-3 border-custom-input-border">
            <Tabs defaultValue="write" className="w-full">
              <TabsList className="grid w-full grid-cols-2" tabIndex={-1}>
                <TabsTrigger value="write">{t("write-tab")}</TabsTrigger>
                <TabsTrigger value="preview">{t("preview-tab")}</TabsTrigger>
              </TabsList>
              <TabsContent value="write" tabIndex={-1}>
                <div className="flex flex-col gap-2 w-full">
                  <FormFieldTextArea
                    control={form.control}
                    name="description"
                    placeholder={t("description-placeholder")}
                    className={cn(
                      "bg-transparent",
                      "border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
                    )}
                    maxLength={1000}
                    wordCounter
                  />
                </div>
              </TabsContent>
              <TabsContent value="preview">
                <MarkdownPreview markdownString={description} />
              </TabsContent>
            </Tabs>
          </Card>

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
