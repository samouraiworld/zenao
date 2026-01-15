"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { useDashboardTeamSettingsEditionContext } from "./dashboard-team-settings-edition-provider";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { IMAGE_FILE_SIZE_LIMIT } from "@/components/features/event/constants";
import Text from "@/components/widgets/texts/text";
import { TeamFormSchemaType } from "@/types/schemas";
import { Button } from "@/components/shadcn/button";
import { Card } from "@/components/widgets/cards/card";
import Heading from "@/components/widgets/texts/heading";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { Tabs, TabsContent } from "@/components/shadcn/tabs";
import TabsIconsList from "@/components/widgets/tabs/tabs-icons-list";
import { getMarkdownEditorTabs } from "@/lib/markdown-editor";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { cn } from "@/lib/tailwind";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

export default function DashboardTeamSettingsHeader() {
  const form = useFormContext<TeamFormSchemaType>();
  const { isUpdating, isSubmittable, formRef, save } =
    useDashboardTeamSettingsEditionContext();
  const t = useTranslations("dashboard.teamSettings.header");

  const bio = form.watch("bio");

  return (
    <div className="w-full flex flex-col gap-4 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-[96px] md:w-[128px]">
          <FormFieldImage
            control={form.control}
            name="avatarUri"
            placeholder={t("avatar-placeholder")}
            aspectRatio={[4, 4]}
            fileSizeLimitMb={IMAGE_FILE_SIZE_LIMIT}
            className="w-full rounded-xl overflow-hidden"
            tooltip={<Text size="sm">{t("change-avatar")}</Text>}
          />
        </div>
        <div className="flex flex-col gap-4 grow">
          <FormFieldInputString
            control={form.control}
            name="displayName"
            label={t("name-label")}
            placeholder={t("name-placeholder")}
          />

          <Card className="rounded px-3 border-custom-input-border p-4 w-full">
            <div className="flex flex-col gap-4 relative">
              <div className="flex items-center gap-2">
                <Heading level={3}>{t("bio-label")}</Heading>
              </div>

              <Tabs defaultValue="write" className="w-full">
                <TabsIconsList
                  tabs={getMarkdownEditorTabs({
                    writeLabel: t("write-tab"),
                    previewLabel: t("preview-tab"),
                  })}
                  className="absolute top-0 right-0 rounded p-0 h-fit"
                />
                <TabsContent value="write" tabIndex={-1}>
                  <FormFieldTextArea
                    control={form.control}
                    name="bio"
                    placeholder={t("bio-placeholder")}
                    className={cn("w-full placeholder:text-secondary-color")}
                    maxLength={1000}
                    wordCounter
                  />
                </TabsContent>
                <TabsContent value="preview">
                  <MarkdownPreview markdownString={bio} />
                </TabsContent>
              </Tabs>
            </div>
          </Card>

          <form ref={formRef} onSubmit={form.handleSubmit(save)}>
            <Button disabled={!isSubmittable || isUpdating}>
              {t("save-btn")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
