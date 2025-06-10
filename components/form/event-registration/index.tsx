"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { SignedOut, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FormFieldInputString } from "../components/FormFieldInputString";
import { InviteeForm } from "./invitee-form";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { Form } from "@/components/shadcn/form";
import {
  useEventParticipateGuest,
  useEventParticipateLoggedIn,
} from "@/lib/mutations/event-participate";
import { useToast } from "@/app/hooks/use-toast";
import { eventOptions } from "@/lib/queries/event";
import { captureException } from "@/lib/report";

const emailListSchema = z.object({
  email: z.string().email(),
});

const eventRegistrationFormSchema = z.object({
  email: z.string().email().optional(),
  guests: z.array(emailListSchema),
});

export type EventRegistrationFormSchemaType = z.infer<
  typeof eventRegistrationFormSchema
>;

type EventRegistrationFormProps = {
  eventId: string;
  eventPassword: string;
  userAddress: string | null;
  onGuestRegistrationSuccess?: (email: string) => void;
};

export type SubmitStatusInvitee = Record<
  `emails.${number}.email`,
  "loading" | "error" | "success"
>;

export function EventRegistrationForm({
  eventId,
  eventPassword,
  userAddress,
  onGuestRegistrationSuccess,
}: EventRegistrationFormProps) {
  const { getToken, userId } = useAuth();
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { toast } = useToast();

  const [isPending, setIsPending] = useState(false);
  const { participate: participateLoggedIn } = useEventParticipateLoggedIn();
  const { participate: participateGuest } = useEventParticipateGuest();

  const t = useTranslations("event");
  const form = useForm<EventRegistrationFormSchemaType>({
    resolver: zodResolver(
      eventRegistrationFormSchema.extend({
        guests: z
          .array(emailListSchema)
          .max(data.capacity - data.participants - 1),
      }),
    ),
    defaultValues: {
      email: userId ? undefined : "",
      guests: [],
    },
  });

  const onSubmit = async (data: EventRegistrationFormSchemaType) => {
    const guests = data.guests.reduce<string[]>((acc, e) => {
      acc.push(e.email);
      return acc;
    }, []);

    setIsPending(true);

    try {
      if (userId) {
        // Authenticated
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
          guests,
          password: eventPassword,
        });
      } else {
        // Guest
        await participateGuest({
          eventId,
          email: data.email!,
          guests,
          userAddress,
          password: eventPassword,
        });
        onGuestRegistrationSuccess?.(data.email!);
      }
      setIsPending(false);
      toast({ title: t("toast-confirmation") });
      form.reset();
    } catch (err) {
      if (
        err instanceof Error &&
        err.message !== "[unknown] user is already participant for this event"
      ) {
        captureException(err);
      }
      toast({
        variant: "destructive",
        title:
          err instanceof Error &&
          err.message === "[unknown] user is already participant for this event"
            ? t("toast-already-registered-error")
            : t("toast-default-error"),
      });
    }
    setIsPending(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <SignedOut>
            <FormFieldInputString
              control={form.control}
              disabled={isPending}
              name="email"
              label={t("your-email")}
              placeholder={t("email-placeholder")}
            />
          </SignedOut>
          <InviteeForm userId={userId} loading={isPending} />
          <ButtonWithLabel
            type="submit"
            loading={isPending}
            label={t("register-button")}
          />
        </div>
      </form>
    </Form>
  );
}
