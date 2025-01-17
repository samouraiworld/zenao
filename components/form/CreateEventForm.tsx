"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useClerk } from "@clerk/nextjs";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { zenaoClient } from "@/app/zenao-client";
import { Button } from "@/components/shadcn/button";
import { Form } from "@/components/shadcn/form";

const createEventFormSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  imageUri: z.string().trim().min(1),
  startDate: z.date(),
  endDate: z.date(),
  ticketPrice: z.coerce.number(),
  capacity: z.coerce.number(),
});

export type FormSchemaType = z.infer<typeof createEventFormSchema>;

export const CreateEventForm: React.FC = () => {
  const { client } = useClerk();
  const form = useForm<FormSchemaType>({
    resolver: zodResolver(createEventFormSchema),
    defaultValues: {
      title: "teset",
      description: "test",
      imageUri: "test",
      ticketPrice: 5,
      capacity: 100,
    },
  });

  const onSubmit = async (values: FormSchemaType) => {
    // Do something with the form values.
    // ✅ This will be type-safe and validated.
    const token = await client.activeSessions[0].getToken();
    if (!token) {
      throw new Error("invalid clerk token");
    }
    await zenaoClient.createEvent(
      {
        ...values,
        startDate: BigInt(Math.floor(values.startDate.getTime() / 1000)),
        endDate: BigInt(Math.floor(values.endDate.getTime() / 1000)),
      },
      {
        headers: {
          Authorization: "Bearer " + token,
        },
      },
    );
    alert("Success");
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
        <Button type="submit">Create Event</Button>
      </form>
    </Form>
  );
};
