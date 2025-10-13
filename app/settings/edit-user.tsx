"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Form } from "@/components/shadcn/form";
import { userAddressOptions } from "@/lib/queries/user";
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

export const EditUserForm: React.FC<{ userId: string }> = ({ userId }) => {
  const router = useRouter();

  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values

  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(profileOptions(address));
  const profileDetails = deserializeWithFrontMatter({
    serialized: user?.bio ?? "",
    schema: gnoProfileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
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

  const onSubmit = async (values: UserFormSchemaType) => {
    try {
      if (!user) {
        throw new Error("no user");
      }
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await editUser({
        address: address || "",
        token,
        avatarUri: values.avatarUri,
        displayName: values.displayName,
        bio: serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
          values.bio,
          {
            socialMediaLinks: values.socialMediaLinks,
            location: values.location,
            shortBio: values.shortBio,
            bannerUri: values.bannerUri,
            skills: values.skills,
          },
        ),
      });

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
            className="w-full rounded-xl overflow-hidden"
            tooltip={<Text size="sm">{t("change-banner")}</Text>}
          />
          <div className="w-[96px] md:w-[128px] absolute -bottom-20 left-6">
            <FormFieldImage
              control={form.control}
              name="avatarUri"
              placeholder={t("avatar-placeholder")}
              aspectRatio={[4, 4]}
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
            <FormFieldInputString
              control={form.control}
              name="shortBio"
              label={t("shortbio-label")}
              placeholder={t("shortbio-placeholder")}
            />
            <FormFieldTextArea
              control={form.control}
              name="bio"
              placeholder={t("bio-placeholder")}
              label={t("bio-label")}
              wordCounter
              maxLength={1000}
            />
          </div>
          <div className="flex flex-col gap-4 w-full">
            <FormFieldInputString
              control={form.control}
              name="location"
              label={t("location-label")}
              placeholder={t("location-placeholder")}
            />

            <SkillsList form={form} />
            <SocialMediaLinks form={form} />

            <ButtonWithChildren
              loading={isPending}
              type="submit"
              className="w-full"
            >
              {t("save-button")}
            </ButtonWithChildren>
          </div>
        </div>
      </form>
    </Form>
  );
};
