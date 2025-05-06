"use client";

import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { InviteeForm } from "./invitee-form";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { useEventInfo } from "@/components/providers/event-provider";
import { Form } from "@/components/shadcn/form";

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
  userId?: string | null;
};

export function EventRegistrationForm({ userId }: EventRegistrationFormProps) {
  const { capacity, participants } = useEventInfo();
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

  const onSubmit = (data: EventRegistrationFormSchemaType) => {
    console.log(data);
    // form.reset()
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4">
          <InviteeForm userId={userId} />
          <ButtonWithLabel
            type="submit"
            // loading={isLoading}
            label={t("register-button")}
          />
        </div>
      </form>
    </Form>
  );
}
