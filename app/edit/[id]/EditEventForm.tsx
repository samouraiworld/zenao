"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { eventFormSchema, EventFormSchemaType } from "@/components/form/types";
import { eventOptions, eventUserOrganizer } from "@/lib/queries/event";
import { zenaoClient } from "@/app/zenao-client";
import { Text } from "@/components/texts/DefaultText";
import { EventForm } from "@/components/form/EventForm";

export function EditEventForm({
  id,
  authToken,
}: {
  id: string;
  authToken: string | null;
}) {
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: isOrganizer } = useSuspenseQuery(
    eventUserOrganizer(authToken, id),
  );
  const router = useRouter();

  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues: data,
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      setIsLoaded(true);
      if (!authToken) {
        throw new Error("invalid clerk authToken");
      }
      await zenaoClient.editEvent(
        { ...values, eventId: id },
        {
          headers: { Authorization: "Bearer " + authToken },
        },
      );
      setIsLoaded(false);
      form.reset();
      router.push(`/edit/${id}`);
    } catch (err) {
      console.error("error", err);
    }
  };

  if (!isOrganizer) {
    return (
      <div className="flex justify-center">
        <Text>
          {`You can't edit this event because you are not one of the organizer`}
        </Text>
      </div>
    );
  }
  return (
    <EventForm form={form} onSubmit={onSubmit} isLoaded={isLoaded} isEditing />
  );
}
