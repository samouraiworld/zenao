"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { InviteeForm } from "./invitee-form";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { useEventInfo } from "@/components/providers/event-provider";
import { Form } from "@/components/shadcn/form";
import {
  getRelatedQueriesOptions,
  useEventParticipateGuest,
  useEventParticipateLoggedIn,
} from "@/lib/mutations/event-participate";
import { getQueryClient } from "@/lib/get-query-client";
import { useToast } from "@/app/hooks/use-toast";

const emailListSchema = z.object({
  email: z.string().email(),
});

const eventRegistrationFormSchema = z.object({
  emails: z.array(emailListSchema),
});

export type EventRegistrationFormSchemaType = z.infer<
  typeof eventRegistrationFormSchema
>;

type EventRegistrationFormProps = {
  userAddress: string | null;
};

export type SubmitStatusInvitee = Record<
  `emails.${number}.email`,
  "loading" | "error" | "success"
>;

export function EventRegistrationForm({
  userAddress,
}: EventRegistrationFormProps) {
  const queryClient = getQueryClient();
  const { getToken, userId } = useAuth();
  const { id: eventId, capacity, participants } = useEventInfo();
  const [submitStatusInvitees, setSubmitStatusInvitees] =
    useState<SubmitStatusInvitee>({});
  const { toast } = useToast();

  const [isPending, setIsPending] = useState(false);
  const { participate: participateLoggedIn } = useEventParticipateLoggedIn();
  const { participate: participateGuest } = useEventParticipateGuest();

  const t = useTranslations("event");
  const form = useForm<EventRegistrationFormSchemaType>({
    resolver: zodResolver(
      eventRegistrationFormSchema.extend({
        emails: z
          .array(emailListSchema)
          .min(userId ? 0 : 1)
          .max(capacity - participants - (userId ? 1 : 0)),
      }),
    ),
    defaultValues: {
      emails: userId ? [] : [{ email: "" }],
    },
  });

  useEffect(() => {
    const { unsubscribe } = form.watch(() => {
      setSubmitStatusInvitees({});
    });
    return () => unsubscribe();
  }, [form]);

  const onSubmit = async (data: EventRegistrationFormSchemaType) => {
    setIsPending(true);
    try {
      // Register additional invitees
      const status = data.emails.reduce<SubmitStatusInvitee>(
        (acc, _, index) => {
          acc[`emails.${index}.email`] = "loading";
          return acc;
        },
        {},
      );

      setSubmitStatusInvitees(status);

      for (let i = 0; i < data.emails.length; i++) {
        const id: `emails.${number}.email` = `emails.${i}.email`;
        try {
          await participateGuest({
            eventId,
            email: data.emails[i].email,
            userAddress: userAddress,
          });
          status[id] = "success";
        } catch (err) {
          console.error(err);
          status[id] = "error";
        }

        setSubmitStatusInvitees(status);
      }

      if (userId) {
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
      }

      if (Object.values(status).every((v) => v === "success")) {
        // User role optimistic update only if all users have been registered
        const { eventOptionsOpts, eventUserRolesOpts, eventUsersWithRoleOpts } =
          getRelatedQueriesOptions({
            eventId,
            userAddress,
          });

        // Invalidate queries
        queryClient.invalidateQueries(eventOptionsOpts);
        queryClient.invalidateQueries(eventUsersWithRoleOpts);

        queryClient.cancelQueries(eventUserRolesOpts);
        queryClient.setQueryData(eventUserRolesOpts.queryKey, (old) => [
          ...(old ?? []),
          "participant" as const,
        ]);

        toast({ title: t("toast-confirmation") });
        form.reset();
      } else {
        toast({ variant: "destructive", title: t("toast-default-error") });
      }
    } catch (err) {
      console.error(err);
    }
    setIsPending(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <InviteeForm userId={userId} status={submitStatusInvitees} />
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
