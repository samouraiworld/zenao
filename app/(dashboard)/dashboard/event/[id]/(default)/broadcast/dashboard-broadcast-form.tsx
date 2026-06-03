"use client";

import { useAuth } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useForm, UseFormReturn } from "react-hook-form";
import { Send } from "lucide-react";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { useToast } from "@/hooks/use-toast";
import { useEventBroadcastEmail } from "@/lib/mutations/event-management";
import {
  broadcastEmailFormSchema,
  BroadcastEmailFormSchema,
  SafeEventInfo,
} from "@/types/schemas";
import { cn } from "@/lib/tailwind";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldCheckbox } from "@/components/widgets/form/form-field-checkbox";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { Form } from "@/components/shadcn/form";
import { captureException } from "@/lib/report";
import { Tabs, TabsContent } from "@/components/shadcn/tabs";
import TabsIconsList from "@/components/widgets/tabs/tabs-icons-list";
import { getMarkdownEditorTabs } from "@/lib/markdown-editor";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";

interface DashboardBroadcastFormProps {
  eventId: string;
  eventInfo: SafeEventInfo;
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
  const message = form.watch("message");

  return (
    <form onSubmit={onSubmit} className={cn("flex flex-col gap-2", className)}>
      <Tabs defaultValue="write" className="w-full">
        <div className="flex flex-row items-center justify-between mb-1">
          <span className="text-sm font-medium">
            {t("message-input-label")}
          </span>
          <TabsIconsList
            tabs={getMarkdownEditorTabs({
              writeLabel: t("write-tab"),
              previewLabel: t("preview-tab"),
            })}
            className="rounded p-0 h-fit"
          />
        </div>
        <TabsContent value="write" tabIndex={-1}>
          <FormFieldTextArea
            control={form.control}
            name="message"
            placeholder={t("message-input-placeholder")}
            className="min-h-[100px] max-h-[500px]"
            maxLength={5000}
            wordCounter
            disabled={isDisabled}
          />
        </TabsContent>
        <TabsContent value="preview">
          {message.trim() === "" ? (
            <div className="w-full h-32 flex items-center justify-center text-sm text-muted-foreground">
              {t("preview-empty")}
            </div>
          ) : (
            <MarkdownPreview markdownString={message} />
          )}
        </TabsContent>
      </Tabs>
      <div className="mb-4">
        <FormFieldCheckbox
          control={form.control}
          name="attachTicket"
          label={t("attach-ticket-label")}
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
