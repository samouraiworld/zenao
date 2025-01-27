"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useClerk } from "@clerk/nextjs";
import React from "react";
import { useRouter } from "next/navigation";
import { zenaoClient } from "@/app/zenao-client";
import { eventFormSchema, EventFormSchemaType } from "@/components/form/types";
import { EventForm } from "@/components/form/EventForm";

export const CreateEventForm: React.FC = () => {
  const { client } = useClerk();
  const router = useRouter();
  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      imageUri: "",
      description: "",
      title: "",
      capacity: 0,
      location: "",
    },
  });
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await client.activeSessions[0].getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      const { id } = await zenaoClient.createEvent(values, {
        headers: { Authorization: "Bearer " + token },
      });
      setIsLoaded(false);
      form.reset();
      router.push(`/event/${id}`);
    } catch (err) {
      console.error("error", err);
    }
  };

  return <EventForm form={form} onSubmit={onSubmit} isLoaded={isLoaded} />;
};
