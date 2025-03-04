"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import { pollFormSchema, PollFormSchemaType } from "@/components/form/types";
import { useToast } from "@/app/hooks/use-toast";
import { PollForm } from "@/components/form/PollForm";

export const CreatePollForm: React.FC = () => {
  const { getToken } = useAuth();
  const router = useRouter();
  const form = useForm<PollFormSchemaType>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      answers: [{ text: "" }, { text: "" }],
      multipleAnswers: false,
    },
  });
  const { toast } = useToast();
  const t = useTranslations("eventForm");

  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  const onSubmit = async (values: PollFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      // const { id } = await zenaoClient.createEvent(
      //   {
      //     ...values,
      //     location: {
      //       address: {
      //         case: "custom",
      //         value: {
      //           address: values.location,
      //           timezone: currentTimezone(),
      //         },
      //       },
      //     },
      //   },
      //   { headers: { Authorization: "Bearer " + token } },
      // );
      form.reset();
      toast({
        title: t("toast-creation-success"),
      });
      router.push(`/polls`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-creation-error"),
      });
      console.error("error", err);
    }
    setIsLoaded(false);
  };

  return <PollForm form={form} onSubmit={onSubmit} isLoaded={isLoaded} />;
};
