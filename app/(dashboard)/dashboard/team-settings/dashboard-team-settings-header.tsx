"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import { useMemo } from "react";
import { useDashboardTeamSettingsEditionContext } from "./dashboard-team-settings-edition-provider";
import { useTeamContext } from "./team-provider";
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
import RoleBasedViewMode from "@/components/widgets/permissions/view-mode";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/widgets/images/web3-image";

function DashboardTeamSettingsHeaderReadOnly() {
  const team = useTeamContext();

  return (
    <div className="w-full flex flex-col gap-4 mb-8">
      <div className="relative w-full">
        <AspectRatio ratio={4 / 1}>
          <Web3Image
            src="ipfs://bafybeidp4z4cywvdzoyqgdolcqmmxeug62qukpl3nfumjquqragxwr7bny"
            alt="Profile banner"
            priority
            fill
            className="w-full h-full object-cover rounded-b-2xl"
          />
        </AspectRatio>

        <div className="absolute -bottom-16 left-4">
          <div className="relative w-24 h-24 sm:w-40 sm:h-40 rounded-full ring-4 ring-background shadow-md overflow-hidden">
            <Web3Image
              src={team.avatarUri}
              alt="Profile picture"
              priority
              fetchPriority="high"
              fill
              sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 50vw,
                      33vw"
              className="object-cover"
            />
          </div>
        </div>
      </div>

      <div className="mt-20 sm:mt-24 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <Heading level={1} size="4xl">
              {team.displayName}
            </Heading>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {team.bio.trim() && (
          <Card>
            <MarkdownPreview markdownString={team.bio} />
          </Card>
        )}
      </div>
    </div>
  );
}

function DashboardTeamSettingsHeaderForm() {
  const form = useFormContext<TeamFormSchemaType>();
  const { isUpdating, isSubmittable, formRef, save } =
    useDashboardTeamSettingsEditionContext();
  const t = useTranslations("dashboard.teamSettings.header");

  const bio = form.watch("bio");

  return (
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
  );
}

export default function DashboardTeamSettingsHeader() {
  const { role } = useTeamContext();
  const roles = useMemo(() => [role], [role]);

  return (
    <div className="w-full flex flex-col gap-4 mb-8">
      <RoleBasedViewMode
        roles={roles}
        allowedRoles={["team_owner"]}
        fallback={<DashboardTeamSettingsHeaderReadOnly />}
      >
        <DashboardTeamSettingsHeaderForm />
      </RoleBasedViewMode>
    </div>
  );
}
