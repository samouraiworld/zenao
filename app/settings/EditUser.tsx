"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { zenaoClient } from "../zenao-client";
import { useToast } from "@/app/hooks/use-toast";
import { userFormSchema, UserFormSchemaType } from "@/components/form/types";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { FormFieldTextArea } from "@/components/form/components/form-field-textarea";
import { FormFieldImage } from "@/components/form/components/form-field-image";
import { userAddressOptions } from "@/lib/queries/user";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";
import Text from "@/components/texts/text";

type EditUserFormProps = {
  userId: string;
};

export const EditUserForm = ({ userId }: EditUserFormProps) => {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { isLoaded, user: clerkUser } = useUser();

  const queryClient = useQueryClient();

  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: user } = useSuspenseQuery(profileOptions(address));

  const [loading, setLoading] = useState<boolean>(false);

  const defaultValues: GnoProfile = user || {
    address: address || "",
    displayName: "",
    bio: "",
    avatarUri: "",
  };

  const form = useForm<UserFormSchemaType>({
    mode: "all",
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      email: "",
      ...defaultValues,
    },
  });
  const { toast } = useToast();
  const t = useTranslations("settings");

  const onSubmit = async (values: UserFormSchemaType) => {
    try {
      setLoading(true);
      if (!user) {
        throw new Error("no user");
      }
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      await zenaoClient.editUser(values, {
        headers: { Authorization: "Bearer " + token },
      });
      await queryClient.invalidateQueries(profileOptions(user.address));
      toast({
        title: t("toast-success"),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-error"),
      });
      console.error("error", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isLoaded) {
      form.setValue("email", clerkUser?.emailAddresses[0].emailAddress || "");
    }
  }, [isLoaded, clerkUser, form]);

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
            <FormFieldInputString
              control={form.control}
              name="email"
              label={t("email-label")}
              placeholder={t("email-placeholder")}
            />
            <FormFieldTextArea
              control={form.control}
              name="bio"
              placeholder={t("bio-placeholder")}
              label={t("bio-label")}
              wordCounter
              maxLength={1000}
            />
            <div>
              <ButtonWithLabel
                loading={loading}
                label={t("save-button")}
                type="submit"
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
