"use client";

import { useAuth } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, UseFormReturn } from "react-hook-form";
import { Send } from "lucide-react";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { useToast } from "@/hooks/use-toast";
import { useEventBroadcastEmail } from "@/lib/mutations/event-management";
import {
  broadcastEmailFormSchema,
  BroadcastEmailFormSchema,
} from "@/types/schemas";
import { cn } from "@/lib/tailwind";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldCheckbox } from "@/components/widgets/form/form-field-checkbox";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { Form } from "@/components/shadcn/form";
import { captureException } from "@/lib/report";

interface DashboardBroadcastFormProps {
  eventId: string;
  eventInfo: EventInfo;
}

function BroadcastEmailForm({
  className,
  form,
  onSubmit,
  isLoading,
  isDisabled,
}: {
  form: UseFormReturn<BroadcastEmailFormSchema>;
  isLoading: boolean;
  isDisabled: boolean;
} & React.ComponentProps<"form">) {
  const t = useTranslations("broadcast-email-form");

  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col gap-2", className)}>
      <FormFieldTextArea
        control={form.control}
        name="message"
        placeholder={t("message-input-placeholder")}
        label={t("message-input-label")}
        className="min-h-[100px] max-h-[500px]"
        maxLength={5000}
        wordCounter
        disabled={isDisabled}
      />
      <div className="mb-4">
        <FormFieldCheckbox
          control={form.control}
          name="attachTicket"
          label="Attach ticket to the message"
        />
      </div>
      <div className="flex justify-end">
        <ButtonWithChildren loading={isLoading} disabled={isDisabled}>
          <div className="flex gap-2 items-center">
            <Send />
            {t("send")}
          </div>
        </ButtonWithChildren>
      </div>
    </form>
  );
}

export default function DashboardBroadcastForm({
  eventId,
  eventInfo,
}: DashboardBroadcastFormProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { broadcastEmail, isPending } = useEventBroadcastEmail();
  const t = useTranslations("broadcast-email-form");

  const noParticipant = eventInfo.participants === 0;

  const form = useForm<BroadcastEmailFormSchema>({
    resolver: zodResolver(broadcastEmailFormSchema),
    defaultValues: {
      message: "",
      attachTicket: false,
    },
  });

  const onSubmit = async (data: BroadcastEmailFormSchema) => {
    try {
      const token = await getToken();

      if (!token) {
        throw new Error("token missing");
      }

      await broadcastEmail({
        token,
        eventId,
        ...data,
      });
      trackEvent("EventEmailBroadcasted", {
        props: {
          eventId,
        },
      });
      form.reset();

      toast({
        title: t("toast-email-sent-success"),
      });
    } catch (err) {
      captureException(err);
      toast({
        title: t("toast-email-sent-error"),
      });
    }
  };

  return (
    <Form {...form}>
      <BroadcastEmailForm
        form={form}
        onSubmit={form.handleSubmit(onSubmit)}
        isLoading={isPending}
        isDisabled={noParticipant}
      />
    </Form>
  );
}
