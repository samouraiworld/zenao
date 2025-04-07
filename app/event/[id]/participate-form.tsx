"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Form } from "@/components/shadcn/form";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { useToast } from "@/app/hooks/use-toast";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import {
  useEventParticipateGuest,
  useEventParticipateLoggedIn,
} from "@/lib/mutations/event-participate";

const participateFormSchema = z.object({
  email: z.string().email(),
});
type ParticipateFormSchemaType = z.infer<typeof participateFormSchema>;

export function ParticipateForm({
  onSuccess: _,
  eventId,
  userId,
  userAddress,
}: {
  eventId: string;
  userId?: string | null;
  userAddress: string | null;
  onSuccess?: () => void;
}) {
  const { getToken } = useAuth();
  const t = useTranslations("event");
  const queryClient = useQueryClient();
  const { participate: participateLoggedIn, isPending: isPendingLoggedIn } =
    useEventParticipateLoggedIn(queryClient);
  const { participate: participateGuest, isPending: isPendingGuest } =
    useEventParticipateGuest(queryClient);

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
      await participateGuest({
        eventId,
        email: values.email,
        userAddress: userAddress,
      });
      toast({ title: t("toast-confirmation") });
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
  };

  // Submit for logged-in user (with clerk account)
  const onSubmitSignedIn = async () => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      if (!userId || !userAddress) {
        throw new Error("missing user id or user address");
      }

      await participateLoggedIn({
        eventId,
        token,
        userId: userId,
        userAddress: userAddress,
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
                loading={isPendingGuest}
                label={t("participate-button")}
                type="submit"
              />
            </div>
          </SignedOut>
          <SignedIn>
            <ButtonWithLabel
              onClick={onSubmitSignedIn}
              loading={isPendingLoggedIn}
              label={t("participate-button")}
            />
          </SignedIn>
        </div>
      </form>
    </Form>
  );
}
