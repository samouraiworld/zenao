"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { eventFormSchema, EventFormSchemaType } from "@/components/form/types";
import { eventOptions, eventUserOrganizer } from "@/lib/queries/event";
import { zenaoClient } from "@/app/zenao-client";
import { Text } from "@/components/texts/DefaultText";
import { EventForm } from "@/components/form/EventForm";
import { useToast } from "@/app/hooks/use-toast";

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

  const { toast } = useToast();
  const t = useTranslations("eventForm");

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
      form.reset();
      toast({
        title: t("toast-edit-success"),
      });
      router.push(`/event/${id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-edit-error"),
      });
      console.error("error", err);
    }
    setIsLoaded(false);
  };

  if (!isOrganizer) {
    return (
      <div className="flex justify-center">
        <Text>{t("not-organizer-message")}</Text>
      </div>
    );
  }
  return (
    <EventForm form={form} onSubmit={onSubmit} isLoaded={isLoaded} isEditing />
  );
}
