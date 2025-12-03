"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { SignedOut, useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { InviteeForm } from "./invitee-form";
import { Form } from "@/components/shadcn/form";
import {
  useEventParticipateGuest,
  useEventParticipateLoggedIn,
} from "@/lib/mutations/event-participate";
import { useToast } from "@/hooks/use-toast";
import { eventOptions } from "@/lib/queries/event";
import { captureException } from "@/lib/report";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { emailSchema } from "@/types/schemas";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { userInfoOptions } from "@/lib/queries/user";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

const eventRegistrationFormSchema = z.object({
  email: z.string().email().optional(),
  guests: z.array(emailSchema),
});

export type EventRegistrationFormSchemaType = z.infer<
  typeof eventRegistrationFormSchema
>;

type EventRegistrationFormProps = {
  eventId: string;
  eventPassword: string;
  onGuestRegistrationSuccess?: (email: string) => void;
};

export type SubmitStatusInvitee = Record<
  `emails.${number}.email`,
  "loading" | "error" | "success"
>;

export function EventRegistrationForm({
  eventId,
  eventPassword,
  onGuestRegistrationSuccess,
}: EventRegistrationFormProps) {
  const { trackEvent } = useAnalyticsEvents();
  const { getToken, userId } = useAuth();
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";
  const { toast } = useToast();

  const [isPending, setIsPending] = useState(false);
  const { participate: participateLoggedIn } = useEventParticipateLoggedIn();
  const { participate: participateGuest } = useEventParticipateGuest();

  const t = useTranslations("event");
  const form = useForm<EventRegistrationFormSchemaType>({
    resolver: zodResolver(
      eventRegistrationFormSchema.extend({
        guests: z.array(emailSchema).max(data.capacity - data.participants - 1),
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
        if (!userId || !userRealmId) {
          throw new Error("missing user id or user address");
        }

        await participateLoggedIn({
          eventId,
          token,
          userId: userId,
          userRealmId: userRealmId,
          guests,
          password: eventPassword,
        });

        trackEvent("EventParticipation", {
          props: {
            eventId,
            method: "loggedIn",
          },
        });
      } else {
        // Guest
        await participateGuest({
          eventId,
          email: data.email!,
          guests,
          userRealmId,
          password: eventPassword,
        });
        trackEvent("EventParticipation", {
          props: {
            eventId,
            method: "guest",
          },
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
          <ButtonWithChildren loading={isPending} type="submit">
            {t("register-button")}
          </ButtonWithChildren>
        </div>
      </form>
    </Form>
  );
}
