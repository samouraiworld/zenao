"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { eventFormSchema, EventFormSchemaType } from "@/components/form/types";
import { eventOptions } from "@/lib/queries/event";
import { zenaoClient } from "@/app/zenao-client";
import { Text } from "@/components/texts/DefaultText";
import { EventForm } from "@/components/form/EventForm";
import { useToast } from "@/app/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-user-roles";
import { currentTimezone } from "@/lib/time";
import { userAddressOptions } from "@/lib/queries/user";

export function EditEventForm({ id, userId }: { id: string; userId: string }) {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(id, address));
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

  const form = useForm({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk authToken");
      }
      await zenaoClient.editEvent(
        {
          ...values,
          eventId: id,
          location: {
            address: {
              case: "custom",
              value: { address: values.location, timezone: currentTimezone() },
            },
          },
        },
        {
          headers: { Authorization: "Bearer " + token },
        },
      );
      await queryClient.invalidateQueries(eventOptions(id));
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
