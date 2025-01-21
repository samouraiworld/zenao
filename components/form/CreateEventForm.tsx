"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { eventFormSchema, EventFormSchemaType } from "./types";
import { zenaoClient } from "@/app/zenao-client";
import { Button } from "@/components/shadcn/button";
import { Form } from "@/components/shadcn/form";

export const CreateEventForm: React.FC = () => {
  const { client } = useClerk();
  const t = useTranslations("create");
  const form = useForm<EventFormSchemaType>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "teset",
      description: "test",
      imageUri: "test",
      ticketPrice: 5,
      capacity: 100,
    },
  });

  const onSubmit = async (values: EventFormSchemaType) => {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    const token = await client.activeSessions[0].getToken();
    if (!token) {
      throw new Error("invalid clerk token");
    }
    try {
      await zenaoClient.createEvent(values, {
        headers: { Authorization: "Bearer " + token },
      });
      alert("Success");
    } catch (err) {
      console.error("error", err);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-1">
        <FormFieldInputString control={form.control} name="title" />
        <FormFieldInputString control={form.control} name="description" />
        <FormFieldInputString control={form.control} name="imageUri" />
        <FormFieldInputNumber control={form.control} name="ticketPrice" />
        <FormFieldInputNumber control={form.control} name="capacity" />
        <FormFieldDatePicker control={form.control} name="startDate" />
        <FormFieldDatePicker control={form.control} name="endDate" />
        <Button type="submit">{t("create-event-button")}</Button>
      </form>
    </Form>
  );
};
