"use client";

import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import React from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/shadcn/form";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { useToast } from "@/app/hooks/use-toast";
import {
  useEventParticipateGuest,
  useEventParticipateLoggedIn,
} from "@/lib/mutations/event-participate";
import { useEventInfo } from "@/components/providers/event-provider";

const participateFormSchema = z.object({
  emails: z.array(z.string().email()),
});
type ParticipateFormSchemaType = z.infer<typeof participateFormSchema>;

export function ParticipateForm({
  onSuccess: _,
  userId,
  userAddress,
}: {
  eventId: string;
  userId?: string | null;
  userAddress: string | null;
  onSuccess?: () => void;
}) {
  const { id: eventId, capacity, participants } = useEventInfo();

  const { getToken } = useAuth();
  const t = useTranslations("event");
  const { participate: participateLoggedIn, isPending: isPendingLoggedIn } =
    useEventParticipateLoggedIn();
  const { participate: participateGuest, isPending: isPendingGuest } =
    useEventParticipateGuest();

  const form = useForm<ParticipateFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      participateFormSchema.extend({
        emails: z
          .array(z.string().email())
          .min(1)
          .max(capacity - participants),
      }),
    ),
    defaultValues: {
      emails: [""],
    },
  });
  const { toast } = useToast();

  // Submit for logged-out user (with email confirmation form)
  const onSubmitSignedOut = async (values: ParticipateFormSchemaType) => {
    try {
      await participateGuest({
        eventId,
        email: values.emails[0], // ! FIX
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
              {/* <FormFieldInputString
                control={form.control}
                name="email"
                placeholder={t("email-placeholder")}
              /> */}
              <ButtonWithLabel
                loading={isPendingGuest}
                label={t("register-button")}
                type="submit"
              />
            </div>
          </SignedOut>
          <SignedIn>
            <ButtonWithLabel
              onClick={onSubmitSignedIn}
              loading={isPendingLoggedIn}
              label={t("register-button")}
            />
          </SignedIn>
        </div>
      </form>
    </Form>
  );
}
