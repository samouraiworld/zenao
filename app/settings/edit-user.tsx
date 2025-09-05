"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
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
import { UserFormSchemaType, userFormSchema } from "@/types/schemas";
import SocialMediaLinks from "@/components/features/user/settings/social-media-links";
import {
  deserializeUserProfileDetails,
  serializeUserProfileDetails,
} from "@/lib/user-profile-serialization";

export const EditUserForm: React.FC<{ userId: string }> = ({ userId }) => {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values

  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(profileOptions(address));
  const profileDetails = deserializeUserProfileDetails(user?.bio ?? "");

  const defaultValues: UserFormSchemaType = {
    avatarUri: user?.avatarUri || "",
    displayName: user?.displayName || "",
    bio: profileDetails.bio || "",
    socialMediaLinks: profileDetails.socialMediaLinks,
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
        bio: serializeUserProfileDetails({
          bio: values.bio,
          socialMediaLinks: values.socialMediaLinks,
        }),
      });
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
        className="items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full gap-10">
          <FormFieldImage
            control={form.control}
            name="avatarUri"
            placeholder={t("avatar-placeholder")}
            aspectRatio={1 / 1}
            className="sm:w-2/5"
            tooltip={<Text size="sm">{t("change-avatar")}</Text>}
          />
          <div className="flex flex-col gap-4 w-full sm:w-3/5">
            <FormFieldInputString
              control={form.control}
              name="displayName"
              label={t("name-label")}
              placeholder={t("name-placeholder")}
            />
            <FormFieldTextArea
              control={form.control}
              name="bio"
              placeholder={t("bio-placeholder")}
              label={t("bio-label")}
              wordCounter
              maxLength={1000}
            />

            <SocialMediaLinks form={form} />

            <div>
              <ButtonWithChildren loading={isPending} type="submit">
                {t("save-button")}
              </ButtonWithChildren>
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
