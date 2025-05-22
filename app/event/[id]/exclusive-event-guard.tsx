"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import {
  eventProtectionFormSchema,
  EventProtectionFormSchemaType,
} from "@/components/form/types";
import { useValidateEventPassword } from "@/lib/mutations/event-management";
import { useToast } from "@/app/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { EventPasswordProvider } from "@/components/providers/event-password-provider";

type ExclusiveEventGuardProps = {
  eventId: string;
  exclusive?: boolean;
  children?: React.ReactNode;
};

export function ExclusiveEventGuard({
  eventId,
  exclusive = false,
  children,
}: ExclusiveEventGuardProps) {
  const { getToken, userId } = useAuth();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));
  const isOrganizer = useMemo(() => roles.includes("organizer"), [roles]);
  const isParticipant = useMemo(() => roles.includes("participant"), [roles]);

  console.log(isOrganizer);

  const { validateEventPassword, isPending } = useValidateEventPassword();
  const [canAccess, setCanAccess] = useState<boolean>(
    !exclusive || isOrganizer || (exclusive && isParticipant),
  );
  const t = useTranslations("event-protection-guard");
  const form = useForm<EventProtectionFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventProtectionFormSchema),
    defaultValues: {
      password: "",
    },
  });
  const password = form.watch("password");
  const { toast } = useToast();

  useEffect(() => {
    setCanAccess(!exclusive || isOrganizer || (exclusive && isParticipant));
  }, [exclusive, isOrganizer, isParticipant]);

  const onSubmit = async (data: EventProtectionFormSchemaType) => {
    console.log(eventId, data);

    // Call the API to check if the password is correct
    try {
      const res = await validateEventPassword({
        eventId,
        password: data.password,
      });

      if (!res.valid) {
        throw new Error("Invalid password");
      }

      setCanAccess(true);
    } catch (error: unknown) {
      console.error("Error accessing exclusive event:", error);
      toast({
        variant: "destructive",
        title:
          error instanceof Error && error.message === "Invalid password"
            ? t("toast-access-invalid-password")
            : t("toast-access-error"),
      });
    }
  };

  if (canAccess) {
    return (
      <EventPasswordProvider password={password}>
        {children}
      </EventPasswordProvider>
    );
  }

  return (
    <div className="flex flex-col gap-4 items-center justify-center w-full h-full">
      <Heading level={2} size="2xl">
        {t("title")}
      </Heading>
      <Text>{t("description")}</Text>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="w-full flex flex-col max-w-sm mt-6 gap-4"
        >
          <FormFieldInputString
            control={form.control}
            name="password"
            placeholder={t("password-placeholder")}
            inputType="password"
          />
          <ButtonWithChildren
            type="submit"
            className="w-full rounded"
            loading={isPending}
          >
            <div className="flex items-center">
              <Lock className="mr-2" />
              {t("access-button")}
            </div>
          </ButtonWithChildren>
        </form>
      </Form>
    </div>
  );
}
