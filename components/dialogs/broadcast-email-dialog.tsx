"use client";

import { useForm, UseFormReturn } from "react-hook-form";
import { Send } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import { Form } from "../shadcn/form";
import { FormFieldTextArea } from "../form/components/form-field-textarea";
import { ButtonWithChildren } from "../buttons/ButtonWithChildren";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { cn } from "@/lib/tailwind";

type BroadcastEmailDialogProps = {
  eventId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function BroadcastEmailDialog({
  eventId,
  open,
  onOpenChange,
}: BroadcastEmailDialogProps) {
  const t = useTranslations("broadcast-email-form");

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const form = useForm<{ message: string }>({
    defaultValues: {
      message: "",
    },
  });

  const onSubmit = async (data: { message: string }) => {
    console.log(eventId, data);
    form.reset();
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
            <Form {...form}>
              <BroadcastEmailForm
                form={form}
                onSubmit={form.handleSubmit(onSubmit)}
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
}: {
  form: UseFormReturn<{ message: string }>;
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
      />
      <div className="flex justify-end">
        <ButtonWithChildren>
          <div className="flex gap-2 items-center">
            <Send />
            {t("send")}
          </div>
        </ButtonWithChildren>
      </div>
    </form>
  );
}
