"use client";

import { useForm, UseFormReturn } from "react-hook-form";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/clerk-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import { Form } from "../shadcn/form";
import { ButtonWithChildren } from "../widgets/buttons/button-with-children";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import Text from "../widgets/texts/text";
import { FormFieldCheckbox } from "../widgets/form/form-field-checkbox";
import { FormFieldTextArea } from "../widgets/form/form-field-textarea";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { cn } from "@/lib/tailwind";
import { useEventBroadcastEmail } from "@/lib/mutations/event-management";
import { useToast } from "@/app/hooks/use-toast";
import { captureException } from "@/lib/report";

type BroadcastEmailDialogProps = {
  eventId: string;
  open: boolean;
  nbParticipants: number;
  onOpenChange: (open: boolean) => void;
};

const broadcastEmailFormSchema = z.object({
  message: z
    .string()
    .min(30, "Message must be at least 30 characters")
    .max(5000, "Message must be at most 5000 characters"),
  attachTicket: z.boolean(),
});

type BroadcastEmailFormSchema = z.infer<typeof broadcastEmailFormSchema>;

export function BroadcastEmailDialog({
  eventId,
  open,
  nbParticipants,
  onOpenChange,
}: BroadcastEmailDialogProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { broadcastEmail, isPending } = useEventBroadcastEmail();
  const t = useTranslations("broadcast-email-form");
  const noParticipant = nbParticipants === 0;

  const isDesktop = useMediaQuery("(min-width: 768px)");
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
      form.reset();
      onOpenChange(false);

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

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogClose />
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("desc")}</DialogDescription>
          </DialogHeader>

          <div className="w-full">
            {noParticipant && (
              <Text className="text-destructive">
                {t("no-participant-error")}
              </Text>
            )}
            <Form {...form}>
              <BroadcastEmailForm
                form={form}
                onSubmit={form.handleSubmit(onSubmit)}
                isLoading={isPending}
                isDisabled={noParticipant}
              />
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("desc")}</DrawerDescription>
        </DrawerHeader>
        <Form {...form}>
          <BroadcastEmailForm
            form={form}
            onSubmit={form.handleSubmit(onSubmit)}
            className="px-4"
            isLoading={isPending}
            isDisabled={noParticipant}
          />
        </Form>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <ButtonWithChildren variant="outline">
              {t("cancel")}
            </ButtonWithChildren>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
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
      <div>
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
