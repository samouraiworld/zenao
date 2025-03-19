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
import { EventForm } from "@/components/form/EventForm";
import { useToast } from "@/app/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-users";
import { currentTimezone } from "@/lib/time";
import { userAddressOptions } from "@/lib/queries/user";
import Text from "@/components/texts/text";

export function EditEventForm({ id, userId }: { id: string; userId: string }) {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(id, address));
  const isOrganizer = roles.includes("organizer");
  const router = useRouter();

  // Correctly reconstruct location object
  let location: EventFormSchemaType["location"] = {
    kind: "custom",
    address: "",
    timeZone: "",
  };
  switch (data.location?.address.case) {
    case "custom":
      location = {
        kind: "custom",
        address: data.location?.address.value.address,
        timeZone: data.location?.address.value.timezone,
      };
      break;
    case "geo":
      location = {
        kind: "geo",
        address: data.location?.address.value.address,
        lat: data.location?.address.value.lat,
        lng: data.location?.address.value.lng,
        size: data.location?.address.value.size,
      };
      break;
    case "virtual":
      location = {
        kind: "virtual",
        location: data.location?.address.value.uri,
      };
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

  // EditEvent call loaded value
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
      // Construct location object for the call
      let value = {};
      switch (values.location.kind) {
        case "custom":
          value = {
            address: values.location.address,
            timezone: currentTimezone(),
          };
          break;
        case "virtual":
          value = { uri: values.location.location };
          break;
        case "geo":
          value = {
            address: values.location.address,
            lat: values.location.lat,
            lng: values.location.lng,
            size: values.location.size,
          };
          break;
        default:
          value = {};
      }
      await zenaoClient.editEvent(
        {
          ...values,
          eventId: id,
          location: { address: { case: values.location.kind, value } },
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
    <EventForm
      form={form}
      onSubmit={onSubmit}
      isLoaded={isLoaded}
      isEditing
      maxDateRange={new Date()}
    />
  );
}
