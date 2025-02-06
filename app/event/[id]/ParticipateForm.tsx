"use client";

import { SignedIn, SignedOut, useSession } from "@clerk/nextjs";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { zenaoClient } from "@/app/zenao-client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { Card } from "@/components/cards/Card";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { useToast } from "@/app/hooks/use-toast";

const participateFormSchema = z.object({
  email: z.string().email(),
});
type ParticipateFormSchemaType = z.infer<typeof participateFormSchema>;

export function ParticipateForm({
  onSuccess,
  eventId,
}: {
  eventId: string;
  onSuccess?: () => void;
}) {
  const { session } = useSession();
  const t = useTranslations("event");
  const [isLoaded, setIsLoaded] = useState(false);
  const form = useForm<ParticipateFormSchemaType>({
    mode: "all",
    resolver: zodResolver(participateFormSchema),
    defaultValues: {
      email: "",
    },
  });
  const { toast } = useToast();

  // Submit for logged-out user (with email confirmation form)
  const onSubmitForm = async (values: ParticipateFormSchemaType) => {
    try {
      setIsLoaded(true);
      await zenaoClient.participate({ eventId, email: values.email });
      toast({ title: t("toast-confirmation") });
      onSuccess?.();
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
    setIsLoaded(false);
  };

  // Submit for logged-in user (with clerk account)
  const onSubmit = async () => {
    try {
      setIsLoaded(true);
      const token = await session?.getToken();
      await zenaoClient.participate(
        { eventId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast({ title: t("toast-confirmation") });
      onSuccess?.();
    } catch (err) {
      toast({ variant: "destructive", title: t("toast-default-error") });
      console.error(err);
    }
    setIsLoaded(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitForm)}>
        <div>
          <SignedOut>
            {/* TODO: merge with FormFieldInputString (got typescript issues) */}
            <Card className="bg-background mb-2">
              <FormField
                rules={{ required: true }}
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="email"
                        className="focus-visible:ring-0 border-none h-auto p-0 placeholder:text-secondary-color"
                        placeholder={t("email-placeholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </Card>
            <ButtonWithLabel
              loading={isLoaded}
              label={t("participate-button")}
              type="submit"
            />
          </SignedOut>
          <SignedIn>
            <ButtonWithLabel
              onClick={onSubmit}
              loading={isLoaded}
              label={t("participate-button")}
            />
          </SignedIn>
        </div>
      </form>
    </Form>
  );
}
