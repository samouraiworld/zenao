"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useSession } from "@clerk/nextjs";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { zenaoClient } from "@/app/zenao-client";
import { eventFormSchema, EventFormSchemaType } from "@/components/form/types";
import { EventForm } from "@/components/form/EventForm";
import { useToast } from "@/app/hooks/use-toast";

export const CreateEventForm: React.FC = () => {
  const { session } = useSession();
  const router = useRouter();
  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      imageUri: "",
      description: "",
      title: "",
      capacity: 1,
      location: "",
    },
  });
  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await session?.getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      const { id } = await zenaoClient.createEvent(
        {
          ...values,
          location: {
            address: {
              case: "custom",
              value: {
                address: values.location,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            },
          },
        },
        { headers: { Authorization: "Bearer " + token } },
      );
      form.reset();
      toast({
        title: t("toast-creation-success"),
      });
      router.push(`/event/${id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-creation-error"),
      });
      console.error("error", err);
    }
    setIsLoaded(false);
  };

  return <EventForm form={form} onSubmit={onSubmit} isLoaded={isLoaded} />;
};
