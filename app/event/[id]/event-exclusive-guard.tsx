"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Lock } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";
import { imageHeight, imageWidth } from "./constants";
import Heading from "@/components/widgets/texts/heading";
import Text from "@/components/widgets/texts/text";
import { Form } from "@/components/shadcn/form";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { useToast } from "@/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import { EventPasswordProvider } from "@/components/providers/event-password-provider";
import { zenaoClient } from "@/lib/zenao-client";
import { ScreenContainer } from "@/components/layout/screen-container";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { captureException } from "@/lib/report";
import {
  eventProtectionFormSchema,
  EventProtectionFormSchemaType,
} from "@/types/schemas";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";

type ExclusiveEventGuardProps = {
  eventId: string;
  title: string;
  imageUri: string;
  exclusive?: boolean;
  children?: React.ReactNode;
};

export function ExclusiveEventGuard({
  eventId,
  title,
  imageUri,
  exclusive = false,
  children,
}: ExclusiveEventGuardProps) {
  const { getToken, userId } = useAuth();
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(eventId, address));

  const [isPending, setIsPending] = useState(false);
  const [isCheckingAccess, setIsCheckingAccess] = useState<boolean>(true);
  const isMember = useMemo(() => roles.length > 0, [roles]);
  const [canAccess, setCanAccess] = useState<boolean>(!exclusive || isMember);

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

  useLayoutEffect(() => {
    setCanAccess(!exclusive || isMember);
    const timeout = setTimeout(() => setIsCheckingAccess(false), 1000);

    return () => clearTimeout(timeout);
  }, [exclusive, isMember]);

  const onSubmit = async (data: EventProtectionFormSchemaType) => {
    // Call the API to check if the password is correct
    try {
      setIsPending(true);
      const res = await zenaoClient.validatePassword({
        eventId,
        password: data.password,
      });
      setIsPending(false);
      if (!res.valid) {
        throw new Error("Invalid password");
      }
      setCanAccess(true);
    } catch (error: unknown) {
      if (error instanceof Error && error.message !== "Invalid password") {
        captureException(error);
      }

      toast({
        duration: 3000,
        variant: "destructive",
        title:
          error instanceof Error && error.message === "Invalid password"
            ? t("toast-access-invalid-password")
            : t("toast-access-error"),
      });
    }
    setIsPending(false);
  };

  if (canAccess) {
    return (
      <EventPasswordProvider password={password}>
        {children}
      </EventPasswordProvider>
    );
  }

  return (
    <ScreenContainer
      background={{
        src: imageUri,
        width: imageWidth,
        height: imageHeight,
      }}
    >
      <div className="flex flex-col gap-8 items-center justify-center w-full h-full">
        <div className="w-full max-w-[512px]">
          <AspectRatio ratio={16 / 9}>
            <Web3Image
              src={imageUri}
              sizes="(max-width: 768px) 100vw,
            (max-width: 1200px) 50vw,
            33vw"
              fill
              alt="Event"
              priority
              fetchPriority="high"
              className="flex w-full rounded-xl self-center object-cover"
            />
          </AspectRatio>
        </div>
        <Heading level={2} size="2xl">
          {title}
        </Heading>
        <Text className="text-center">{t("description")}</Text>

        {isCheckingAccess ? (
          <div className="w-full flex justify-center items-center">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : (
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
        )}
      </div>
    </ScreenContainer>
  );
}
