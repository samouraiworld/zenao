"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/shadcn/form";
import { userInfoOptions } from "@/lib/queries/user";
import { profileOptions } from "@/lib/queries/profile";
import Text from "@/components/widgets/texts/text";
import { useEditUserProfile } from "@/lib/mutations/profile";
import { captureException } from "@/lib/report";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import {
  GnoProfileDetails,
  UserFormSchemaType,
  gnoProfileDetailsSchema,
  userFormSchema,
} from "@/types/schemas";
import SocialMediaLinks from "@/components/features/user/settings/social-media-links";
import SkillsList from "@/components/features/user/settings/skills-list";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import { Card } from "@/components/widgets/cards/card";
import { Tabs, TabsContent } from "@/components/shadcn/tabs";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { cn } from "@/lib/tailwind";
import Heading from "@/components/widgets/texts/heading";
import { addressFromRealmId } from "@/lib/gno";
import UserExperiences from "@/components/features/user/settings/user-experiences";
import { getMarkdownEditorTabs } from "@/lib/markdown-editor";
import TabsIconsList from "@/components/widgets/tabs/tabs-icons-list";
import { IMAGE_FILE_SIZE_LIMIT } from "../event/[id]/constants";

export const EditUserForm: React.FC<{ userId: string }> = ({ userId }) => {
  const router = useRouter();

  const { getToken } = useAuth();

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { data: user } = useSuspenseQuery(profileOptions(userRealmId));
  const profileDetails = deserializeWithFrontMatter({
    serialized: user?.bio ?? "",
    schema: gnoProfileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
      experiences: [],
      skills: [],
    },
    contentFieldName: "bio",
  });

  const defaultValues: UserFormSchemaType = {
    avatarUri: user?.avatarUri || "",
    bannerUri: profileDetails.bannerUri || "",
    displayName: user?.displayName || "",
    bio: profileDetails.bio || "",
    socialMediaLinks: profileDetails.socialMediaLinks,
    location: profileDetails.location || "",
    shortBio: profileDetails.shortBio || "",
    experiences: profileDetails.experiences || [],
    skills: profileDetails.skills,
  };

  const { editUser, isPending } = useEditUserProfile();
  const form = useForm<UserFormSchemaType>({
    mode: "all",
    resolver: zodResolver(userFormSchema),
    defaultValues,
  });
  const { toast } = useToast();
  const t = useTranslations("settings");

  const bio = form.watch("bio");

  const onSubmit = async (values: UserFormSchemaType) => {
    try {
      if (!user) {
        throw new Error("no user");
      }
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      if (!userRealmId) {
        throw new Error("no user realm id");
      }

      const bio = serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
        values.bio,
        {
          socialMediaLinks: values.socialMediaLinks,
          location: values.location,
          shortBio: values.shortBio,
          bannerUri: values.bannerUri,
          experiences: values.experiences,
          skills: values.skills,
        },
      );

      await editUser({
        realmId: userRealmId,
        token,
        avatarUri: values.avatarUri,
        displayName: values.displayName,
        bio,
      });

      const address = addressFromRealmId(userRealmId);

      router.push(`/profile/${address}`);
      toast({
        title: t("toast-success"),
      });
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-error"),
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-8 w-full"
      >
        <div className="relative w-full flex flex-col gap-4">
          <FormFieldImage
            control={form.control}
            name="bannerUri"
            placeholder={t("banner-placeholder")}
            aspectRatio={[4, 1]}
            fileSizeLimit={IMAGE_FILE_SIZE_LIMIT}
            className="w-full rounded-xl overflow-hidden"
            tooltip={<Text size="sm">{t("change-banner")}</Text>}
          />
          <div className="w-[96px] md:w-[128px] absolute -bottom-20 left-6">
            <FormFieldImage
              control={form.control}
              name="avatarUri"
              placeholder={t("avatar-placeholder")}
              aspectRatio={[4, 4]}
              fileSizeLimit={IMAGE_FILE_SIZE_LIMIT}
              className="w-full rounded-xl overflow-hidden"
              tooltip={<Text size="sm">{t("change-avatar")}</Text>}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-20 w-full">
          <div className="flex flex-col gap-4 w-full">
            <FormFieldInputString
              control={form.control}
              name="displayName"
              label={t("name-label")}
              placeholder={t("name-placeholder")}
            />

            <Card className="rounded px-3 border-custom-input-border p-4 w-full">
              <div className="mb-4 flex items-center gap-2">
                <Heading level={3}>{t("shortbio-label")}</Heading>
              </div>
              <FormFieldInputString
                control={form.control}
                name="shortBio"
                placeholder={t("shortbio-placeholder")}
                className="mb-4"
              />

              <div className="flex flex-col gap-4 relative">
                <div className="mb-4 flex items-center gap-2">
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
                      className={cn(
                        "bg-transparent border-0 focus-visible:ring-transparent p-0 w-full placeholder:text-secondary-color",
                      )}
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
          </div>
          <div className="flex flex-col gap-4 w-full">
            <FormFieldInputString
              control={form.control}
              name="location"
              label={t("location-label")}
              placeholder={t("location-placeholder")}
            />

            <SocialMediaLinks control={form.control} name="socialMediaLinks" />
            <SkillsList form={form} />
          </div>

          <div className="flex flex-coll gap-4 w-full lg:col-span-2">
            <UserExperiences form={form} />
          </div>

          <ButtonWithChildren
            loading={isPending}
            type="submit"
            className="w-full"
          >
            {t("save-button")}
          </ButtonWithChildren>
        </div>
      </form>
    </Form>
  );
};
