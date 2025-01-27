"use client";

import { SignedOut, useClerk } from "@clerk/nextjs";
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

const participateFormSchema = z.object({
  email: z.string().email(),
});
type ParticipateFormSchemaType = z.infer<typeof participateFormSchema>;

export function ParticipateForm({ eventId }: { eventId: string }) {
  const { session } = useClerk();
  const t = useTranslations("event");
  const [isLoaded, setIsLoaded] = useState(false);
  const form = useForm<ParticipateFormSchemaType>({
    mode: "all",
    resolver: zodResolver(participateFormSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ParticipateFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await session?.getToken();
      if (token) {
        await zenaoClient.participate(
          { eventId },
          { headers: { Authorization: `Bearer ${token}` } },
        );
      } else {
        await zenaoClient.participate({ eventId, email: values.email });
      }
      form.reset();
    } catch (err) {
      console.error(err);
    }

    setIsLoaded(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
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
          </SignedOut>
          <ButtonWithLabel
            loading={isLoaded}
            label={t("participate-button")}
            type="submit"
          />
        </div>
      </form>
    </Form>
  );
}
