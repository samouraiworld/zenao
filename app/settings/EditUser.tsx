"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { zenaoClient } from "../zenao-client";
import { useToast } from "@/app/hooks/use-toast";
import { userFormSchema, UserFormSchemaType } from "@/components/form/types";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { Card } from "@/components/cards/Card";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { FormFieldTextArea } from "@/components/form/components/FormFieldTextArea";
import { FormFieldImage } from "@/components/form/components/form-field-image";
import { userAddressOptions } from "@/lib/queries/user";
import { GnoProfile, profileOptions } from "@/lib/queries/profile";
import { Separator } from "@/components/shadcn/separator";
import { Button, buttonVariants } from "@/components/shadcn/button";
import Text from "@/components/texts/text";

export const EditUserForm: React.FC<{ userId: string }> = ({ userId }) => {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values

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
    defaultValues,
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
            <Card>
              <FormFieldInputString
                control={form.control}
                name="displayName"
                placeholder={t("name-placeholder")}
              />
            </Card>
            <Card>
              <FormFieldTextArea
                control={form.control}
                name="bio"
                placeholder={t("bio-placeholder")}
              />
            </Card>
            <div>
              <ButtonWithLabel
                loading={loading}
                label={t("save-button")}
                type="submit"
              />
            </div>
          </div>
        </div>
        <Separator className="mb-2" />
        <div className="flex flex-row gap-2">
          <Link
            href={`/profile/${user?.address}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Profile
          </Link>
          <Button asChild variant="destructive" type="button">
            <SignOutButton />
          </Button>
        </div>
      </form>
    </Form>
  );
};
