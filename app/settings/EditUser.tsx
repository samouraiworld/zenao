"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { SignOutButton, useSession } from "@clerk/nextjs";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { zenaoClient } from "../zenao-client";
import { useToast } from "@/app/hooks/use-toast";
import { userFormSchema, UserFormSchemaType } from "@/components/form/types";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { Card } from "@/components/cards/Card";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { FormFieldTextArea } from "@/components/form/components/FormFieldTextArea";
import { FormFieldImage } from "@/components/form/components/FormFieldImage";
import { userOptions, UserSchemaType } from "@/lib/queries/user";
import { GnowebButton } from "@/components/buttons/GnowebButton";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { Button } from "@/components/shadcn/button";
import { SmallText } from "@/components/texts/SmallText";
import { Separator } from "@/components/shadcn/separator";

export const EditUser: React.FC<{ authToken: string | null }> = ({
  authToken,
}) => {
  const { data: user } = useSuspenseQuery(userOptions(authToken));
  const t = useTranslations("settings");

  return (
    <div>
      {!!user?.address && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:mb-3">
          <VeryLargeText className="truncate">{t("title")}</VeryLargeText>
          <GnowebButton
            href={`${process.env.NEXT_PUBLIC_GNOWEB_URL}/r/zenao/cockpit:u/${user.address}`}
            label={t("gnoweb-label")}
          />
        </div>
      )}
      <EditUserForm authToken={authToken} user={user} />

      <Separator className="my-5" />
      <SignOutButton>
        <Button variant="destructive">
          <SmallText>{t("sign-out")}</SmallText>
        </Button>
      </SignOutButton>
    </div>
  );
};

const EditUserForm: React.FC<{
  authToken: string | null;
  user: UserSchemaType | null;
}> = ({ authToken, user }) => {
  const { session } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<UserFormSchemaType>({
    mode: "all",
    resolver: zodResolver(userFormSchema),
    defaultValues: user!,
  });
  const { toast } = useToast();
  const t = useTranslations("settings");

  const queryClient = useQueryClient();

  const handleEditUserSuccess = useCallback(async () => {
    const opts = userOptions(authToken);
    await queryClient.cancelQueries(opts);
    queryClient.setQueryData(opts.queryKey, (user) => user);
  }, [queryClient, authToken]);

  const onSubmit = async (values: UserFormSchemaType) => {
    try {
      setLoading(true);
      const token = await session?.getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      await zenaoClient.editUser(values, {
        headers: { Authorization: "Bearer " + token },
      });
      handleEditUserSuccess();
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
      </form>
    </Form>
  );
};
