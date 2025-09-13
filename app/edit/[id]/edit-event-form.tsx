"use client";

import React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { eventGatekeepersEmails, eventOptions } from "@/lib/queries/event";
import { EventForm } from "@/components/features/event/event-form";
import { useToast } from "@/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-users";
import { userAddressOptions } from "@/lib/queries/user";
import Text from "@/components/widgets/texts/text";
import { makeLocationFromEvent } from "@/lib/location";
import { useEditEvent } from "@/lib/mutations/event-management";
import { captureException } from "@/lib/report";
import { eventFormSchema, EventFormSchemaType } from "@/types/schemas";

export function EditEventForm({ id, userId }: { id: string; userId: string }) {
  const { getToken } = useAuth(); // NOTE: don't get userId from there since it's undefined upon navigation and breaks default values
  const { data } = useSuspenseQuery(eventOptions(id));
  const { data: address } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: roles } = useSuspenseQuery(eventUserRoles(id, address));
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(id, getToken),
  );

  // TODO Get communities where event is held and check if user is admin there
  const communityId = "";

  const isOrganizer = roles.includes("organizer");

  const router = useRouter();

  // Correctly reconstruct location object
  const location = makeLocationFromEvent(data.location);
  const defaultValues: EventFormSchemaType = {
    ...data,
    location,
    gatekeepers: gatekeepers.gatekeepers.map((gatekeeperEmail) => ({
      email: gatekeeperEmail,
    })),
    exclusive: data.privacy?.eventPrivacy.case === "guarded",
    password: "",
    communityId: communityId || undefined,
  };

  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      eventFormSchema.refine(
        (data) => {
          if (data.exclusive && !defaultValues.exclusive) {
            return data.password && data.password.length > 0;
          }
          return true;
        },
        {
          message: "Password is required when event is exclusive",
          path: ["password"],
        },
      ),
    ),
    defaultValues,
  });

  // EditEvent call loaded value
  const { editEvent, isPending } = useEditEvent(getToken);
  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      await editEvent({ ...values, eventId: id });
      toast({
        title: t("toast-edit-success"),
      });
      router.push(`/event/${id}`);
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-edit-error"),
      });
    }
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
      isLoading={isPending}
      defaultExclusive={defaultValues.exclusive}
      isEditing
      minDateRange={new Date()}
    />
  );
}
