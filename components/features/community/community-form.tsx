"use client";

import React from "react";
import { UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Trash2Icon, Plus, Info } from "lucide-react";
import SocialMediaLinks from "../user/settings/social-media-links";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/widgets/cards/card";
import { Tabs, TabsContent } from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { CommunityFormSchemaType, communityFormSchema } from "@/types/schemas";
import { cn } from "@/lib/tailwind";
import Heading from "@/components/widgets/texts/heading";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import SettingsSection from "@/components/layout/settings-section";
import TabsIconsList from "@/components/widgets/tabs/tabs-icons-list";
import { getMarkdownEditorTabs } from "@/lib/markdown-editor";
import { IMAGE_FILE_SIZE_LIMIT } from "@/components/features/event/constants";

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

  const lastAdmin = adminInputs?.[adminInputs.length - 1];
  const isLastAdminInvalid =
    !lastAdmin ||
    !communityFormSchema.shape.administrators.element.shape.address.safeParse(
      lastAdmin.address,
    ).success;
  const isButtonDisabled = !form.formState.isValid || isLastAdminInvalid;

  const t = useTranslations("community-edit-form");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8 w-full"
      >
        <div className="relative w-full flex flex-col gap-4">
          <FormFieldImage
            name="bannerUri"
            control={form.control}
            aspectRatio={[4, 1]}
            fileSizeLimitMb={IMAGE_FILE_SIZE_LIMIT}
            placeholder={t("upload-banner")}
            className="w-full rounded-xl overflow-hidden"
          />
          <div className="w-[96px] md:w-[128px] absolute -bottom-14 left-4 md:left-10">
            <FormFieldImage
              name="avatarUri"
              control={form.control}
              aspectRatio={[4, 4]}
              fileSizeLimitMb={IMAGE_FILE_SIZE_LIMIT}
              placeholder={t("upload-avatar")}
              className="w-full rounded-xl overflow-hidden"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 mt-20 w-full">
          <SettingsSection title={t("community-name-section")}>
            <Card className="rounded px-3 border-custom-input-border p-4 w-full">
              <FormFieldTextArea
                control={form.control}
                name="displayName"
                placeholder={t("name-placeholder")}
                className={cn(
                  "font-semibold text-xl resize-none bg-transparent",
                  "border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
                )}
                maxLength={140}
                rows={1}
                onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                wordCounter
              />
            </Card>
          </SettingsSection>

          <SettingsSection title={t("about-section")}>
            <Card className="rounded px-3 border-custom-input-border p-4 w-full">
              <div className="transition-all">
                <div className="flex gap-2 items-center">
                  <Heading level={3}>{t("shortDescription-label")}</Heading>

                  <Tooltip delayDuration={500}>
                    <TooltipTrigger
                      type="button"
                      className="group cursor-pointer"
                    >
                      <Info
                        size={16}
                        className="text-muted-foreground transition-colors"
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("shortDescription-tooltip")}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <FormFieldInputString
                  control={form.control}
                  name="shortDescription"
                  placeholder={t("shortDescription-placeholder")}
                  className="mt-4"
                />
              </div>
            </Card>

            <Card className="rounded px-3 border-custom-input-border p-4 w-full relative">
              <div className="flex gap-2 items-center mb-4">
                <Heading level={3}>{t("description-label")}</Heading>

                <Tooltip delayDuration={500}>
                  <TooltipTrigger
                    type="button"
                    className="group cursor-pointer"
                  >
                    <Info
                      size={16}
                      className="text-muted-foreground transition-colors"
                    />
                  </TooltipTrigger>
                  <TooltipContent>{t("description-tooltip")}</TooltipContent>
                </Tooltip>
              </div>

              <Tabs defaultValue="write" className="w-full">
                <TabsIconsList
                  tabs={getMarkdownEditorTabs({
                    writeLabel: t("write-tab"),
                    previewLabel: t("preview-tab"),
                  })}
                  className="absolute right-2 rounded p-0 h-fit"
                  style={{ top: "0.75rem" }}
                />

                <TabsContent value="write" tabIndex={-1}>
                  <FormFieldTextArea
                    control={form.control}
                    name="description"
                    placeholder={t("description-placeholder")}
                    className={cn(
                      "bg-transparent border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
                    )}
                    maxLength={1000}
                    wordCounter
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <MarkdownPreview markdownString={description} />
                </TabsContent>
              </Tabs>
            </Card>
          </SettingsSection>

          <SettingsSection
            title={t("visibility-section")}
            description={t("socialLinks-description")}
          >
            <Card className="p-6">
              <div className="flex flex-col gap-3">
                <SocialMediaLinks
                  control={form.control}
                  name="socialMediaLinks"
                />
              </div>
            </Card>
          </SettingsSection>

          <SettingsSection title={t("admin-label")}>
            <Card className="p-6">
              <div className="flex flex-col gap-3">
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
                  className="w-fit gap-2 mt-2"
                  disabled={isLastAdminInvalid}
                  variant="outline"
                >
                  <Plus className="size-4" />
                  {t("add-admin")}
                </Button>
              </div>
            </Card>
          </SettingsSection>
        </div>

        <SettingsSection title="">
          <ButtonWithChildren
            loading={isLoading}
            disabled={isButtonDisabled}
            type="submit"
            className="px-8 w-full"
          >
            {t("submit")}
          </ButtonWithChildren>
        </SettingsSection>
      </form>
    </Form>
  );
};
