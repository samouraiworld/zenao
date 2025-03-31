"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { zenaoClient } from "@/app/zenao-client";
import { Form } from "@/components/shadcn/form";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { useToast } from "@/app/hooks/use-toast";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { useEventParticipateLoggedIn } from "@/lib/mutations/event-participate";

const participateFormSchema = z.object({
  email: z.string().email(),
});
type ParticipateFormSchemaType = z.infer<typeof participateFormSchema>;

export function ParticipateForm({
  onSuccess,
  eventId,
  user,
}: {
  eventId: string;
  user?: {
    id: string;
    address: string;
  };
  onSuccess?: () => void;
}) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { participate, isPending } = useEventParticipateLoggedIn(queryClient);
  const t = useTranslations("event");
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<ParticipateFormSchemaType>({
    mode: "all",
    resolver: zodResolver(participateFormSchema),
    defaultValues: {
      email: "",
    },
  });
  const { toast } = useToast();

  // Submit for logged-out user (with email confirmation form)
  const onSubmitSignedOut = async (values: ParticipateFormSchemaType) => {
    try {
      setIsLoading(true);
      await zenaoClient.participate({ eventId, email: values.email });
      toast({ title: t("toast-confirmation") });
      onSuccess?.();
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("user is already participant for this event")
      ) {
        toast({
          variant: "destructive",
          title: t("toast-already-participant-error"),
        });
      } else {
        toast({ variant: "destructive", title: t("toast-default-error") });
      }
      console.error(err);
    }
    setIsLoading(false);
  };

  // Submit for logged-in user (with clerk account)
  const onSubmitSignedIn = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      if (!user) {
        throw new Error("missing user");
      }

      await participate({
        eventId,
        token,
        userId: user.id,
        userAddress: user.address,
      });

      toast({ title: t("toast-confirmation") });
    } catch (err) {
      toast({ variant: "destructive", title: t("toast-default-error") });
      console.error(err);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitSignedOut)}>
        <div>
          <SignedOut>
            <div className="flex flex-col gap-2">
              <FormFieldInputString
                control={form.control}
                name="email"
                placeholder={t("email-placeholder")}
              />
              <ButtonWithLabel
                loading={isLoading}
                label={t("participate-button")}
                type="submit"
              />
            </div>
          </SignedOut>
          <SignedIn>
            <ButtonWithLabel
              onClick={onSubmitSignedIn}
              loading={isPending}
              label={t("participate-button")}
            />
          </SignedIn>
        </div>
      </form>
    </Form>
  );
}
