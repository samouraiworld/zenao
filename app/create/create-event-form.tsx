"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { z } from "zod";
import { EventForm } from "@/components/features/event/event-form";
import { useToast } from "@/hooks/use-toast";
import { useCreateEvent } from "@/lib/mutations/event-management";
import { captureException } from "@/lib/report";
import { EventFormSchemaType, eventFormSchema } from "@/types/schemas";

export const CreateEventForm: React.FC = () => {
  const { getToken } = useAuth();
  const router = useRouter();
  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(
      eventFormSchema
        .extend({
          password: z.string().optional(),
        })
        .refine(
          (data) => {
            if (
              data.exclusive &&
              (!data.password || data.password.length < 1)
            ) {
              return false;
            }
            return true;
          },
          {
            message: "Password is required when event is exclusive",
            path: ["password"],
          },
        ),
    ),
    defaultValues: {
      imageUri: "",
      description: "",
      title: "",
      capacity: 1,
      location: {
        kind: "custom",
        address: "",
        timeZone: "",
      },
      exclusive: false,
      password: "",
      gatekeepers: [],
      discoverable: true,
      communityId: null,
    },
  });

  // CreateEvent call loaded value
  const { createEvent, isPending } = useCreateEvent();

  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      const { id } = await createEvent({
        ...values,
        token,
      });
      form.reset();
      toast({
        title: t("toast-creation-success"),
      });
      router.push(`/event/${id}`);
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-creation-error"),
      });
    }
  };

  return (
    <EventForm
      form={form}
      onSubmit={onSubmit}
      isLoading={isPending}
      minDateRange={new Date()}
    />
  );
};
