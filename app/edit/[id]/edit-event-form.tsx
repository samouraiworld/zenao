"use client";

import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { z } from "zod";
import {
  EditEventFormSchemaType,
  eventFormSchema,
  EventFormSchemaType,
} from "@/components/form/types";
import { eventOptions } from "@/lib/queries/event";
import { zenaoClient } from "@/app/zenao-client";
import { EventForm } from "@/components/form/event-form";
import { useToast } from "@/app/hooks/use-toast";
import { eventUserRoles } from "@/lib/queries/event-users";
import { currentTimezone } from "@/lib/time";
import { userAddressOptions } from "@/lib/queries/user";
import Text from "@/components/texts/text";
import { makeLocationFromEvent } from "@/lib/location";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";

function UpdateNotificationDialog({
  open,
  onOpenChange,
  onResponse,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResponse: (shouldNotify: boolean) => void;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>
          The event has changed ! Would you like to notify participants about
          the update of the event ?
        </AlertDialogTitle>
        <AlertDialogDescription>
          An email will be sent to all participants to inform them of the
          changes made to the event.
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onResponse(false)}>
            No
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onResponse(true)}>
            Yes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

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
  const location = makeLocationFromEvent(data.location);
  const defaultValues: EditEventFormSchemaType = {
    ...data,
    location,
    shouldNotify: false,
  };

  const form = useForm<EditEventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      eventFormSchema.extend({
        shouldNotify: z.boolean(),
      }),
    ),
    defaultValues,
  });

  // EditEvent call loaded value
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [open, setOpen] = useState(true);
  const queryClient = useQueryClient();

  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const onSubmit = async (values: EditEventFormSchemaType) => {
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
    <>
      <UpdateNotificationDialog
        open={open}
        onOpenChange={setOpen}
        onResponse={(shouldNotify) => {
          setOpen(false);
          form.setValue("shouldNotify", shouldNotify);
          form.handleSubmit(onSubmit)();
        }}
      />
      <EventForm
        form={form}
        onSubmit={() => {
          setOpen(true);
        }}
        isLoaded={isLoaded}
        isEditing
        maxDateRange={new Date()}
      />
    </>
  );
}
