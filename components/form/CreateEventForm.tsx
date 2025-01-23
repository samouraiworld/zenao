"use client";

import { zenaoClient } from "@/app/zenao-client";
import { Button } from "@/components/shadcn/button";
import { Form } from "@/components/shadcn/form";
import { isValidURL } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import Image from "next/image";
import React from "react";
import { useForm } from "react-hook-form";
import { Card } from "../cards/Card";
import { Separator } from "../common/Separator";
import { Skeleton } from "../shadcn/skeleton";
import { SmallText } from "../texts/SmallText";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { FormFieldInputNumber } from "./components/FormFieldInputNumber";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import { eventFormSchema, EventFormSchemaType, urlPattern } from "./types";

export const CreateEventForm: React.FC = () => {
  const { client } = useClerk();
  const t = useTranslations("create");
  const form = useForm<EventFormSchemaType>({
    mode: "all",
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      imageUri: "",
      description: "",
      title: "",
    },
  });
  const imageUri = form.watch("imageUri");
  const [isLoaded, setIsLoaded] = React.useState<boolean>(false);

  const onSubmit = async (values: EventFormSchemaType) => {
    try {
      setIsLoaded(true);
      const token = await client.activeSessions[0].getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      await zenaoClient.createEvent(values, {
        headers: { Authorization: "Bearer " + token },
      });
      const addr = await zenaoClient.getUserAddress({}, {
        headers: { Authorization: "Bearer " + token },
      })
      console.log(addr);
      setIsLoaded(false);
      form.reset();
      alert("Success");
    } catch (err) {
      console.error("error", err);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full sm:flex-row items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full sm:h-full gap-10">
          <div className="flex flex-col gap-4 w-full sm:w-2/5">
            {/* I'm obligate to check if the URL is valid here because the error message is updated after the value and Image cannot take a wrong URL (throw an error instead)  */}
            {isValidURL(imageUri, urlPattern) &&
              !form.formState.errors.imageUri?.message ? (
              <Image
                src={imageUri}
                width={330}
                height={330}
                alt="imageUri"
                className="flex w-full rounded-xl self-center"
              />
            ) : (
              <Skeleton className="w-full h-[330px] rounded-xnter" />
            )}
            <Card>
              <FormFieldInputString
                control={form.control}
                name="imageUri"
                placeholder={t("image-uri-placeholder")}
              />
            </Card>
          </div>
          <div className="flex flex-col gap-4 w-full sm:w-3/5">
            <FormFieldTextArea
              control={form.control}
              name="title"
              className="font-semibold text-3xl"
              placeholder={t("title-placeholder")}
            />
            <Card>
              <FormFieldInputString
                control={form.control}
                name="description"
                placeholder={t("description-placeholder")}
              />
            </Card>
            <Card>
              <FormFieldInputNumber
                control={form.control}
                name="capacity"
                placeholder={t("capacity-placeholder")}
              />
            </Card>
            <Card className="flex flex-col gap-[10px]">
              <FormFieldDatePicker
                form={form}
                name="startDate"
                placeholder={t("start-date-placeholder")}
              />
              <Separator className="mx-0" />
              <FormFieldDatePicker
                form={form}
                name="endDate"
                placeholder={t("end-date-placeholder")}
              />
            </Card>
            <Button type="submit">
              {/* TODO: Enhance with a spinner, so i don't put the text in i18n */}
              <SmallText variant="invert">
                {isLoaded
                  ? "Form submitted ! Event is creating.."
                  : t("create-event-button")}
              </SmallText>
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
};
