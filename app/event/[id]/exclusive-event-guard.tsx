"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Heading from "@/components/texts/heading";
import Text from "@/components/texts/text";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import {
  eventProtectionFormSchema,
  EventProtectionFormSchemaType,
} from "@/components/form/types";
import { useAccessExclusiveEvent } from "@/lib/mutations/event-management";
import { useToast } from "@/app/hooks/use-toast";

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
  const { accessExclusiveEvent, isPending } = useAccessExclusiveEvent();
  const [canAccess, setCanAccess] = useState<boolean>(!exclusive);
  const t = useTranslations("event-protection-guard");
  const form = useForm<EventProtectionFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventProtectionFormSchema),
    defaultValues: {
      password: "",
    },
  });
  const { toast } = useToast();

  const onSubmit = async (data: EventProtectionFormSchemaType) => {
    console.log(eventId, data);

    // Call the API to check if the password is correct
    try {
      const res = await accessExclusiveEvent({
        eventId,
        password: data.password,
      });

      if (!res.access) {
        throw new Error("Invalid password");
      }

      setCanAccess(true);
    } catch (error) {
      console.error("Error accessing exclusive event:", error);
      toast({
        variant: "destructive",
        title: t("toast-access-error"),
      });
    }
  };

  if (canAccess) {
    return children;
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
