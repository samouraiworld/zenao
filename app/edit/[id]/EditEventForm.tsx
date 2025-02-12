"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useSession } from "@clerk/nextjs";
import { eventFormSchema, EventFormSchemaType } from "@/components/form/types";
import { eventOptions } from "@/lib/queries/event";
import { zenaoClient } from "@/app/zenao-client";
import { Text } from "@/components/texts/DefaultText";
import { EventForm } from "@/components/form/EventForm";
import { useToast } from "@/app/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-user-roles";

export function EditEventForm({
  id,
  authToken,
}: {
  id: string;
  authToken: string | null;
}) {
  const { session } = useSession();
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: roles } = useSuspenseQuery(eventUserRoles(authToken, id));
  const isOrganizer = roles.includes("organizer");
  const router = useRouter();

  let location = "";
  if (data.location?.address.case == "custom") {
    location = data.location.address.value.address;
  }
  const defaultValues: EventFormSchemaType = {
    ...data,
    location,
  };

  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await session?.getToken();
      if (!token) {
        throw new Error("invalid clerk authToken");
      }
      await zenaoClient.editEvent(
        {
          ...values,
          eventId: id,
          location: {
            address: { case: "custom", value: { address: values.location } },
          },
        },
        {
          headers: { Authorization: "Bearer " + token },
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
