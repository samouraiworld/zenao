"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import { useToast } from "@/hooks/use-toast";
import { makeLocationFromEvent } from "@/lib/location";
import {
  communitiesListByEvent,
  communityIdFromPkgPath,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import {
  emailSchema,
  EmailSchemaType,
  EventFormSchemaType,
} from "@/types/schemas";
import { useEditEvent } from "@/lib/mutations/event-management";
import { captureException } from "@/lib/report";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { Button } from "@/components/shadcn/button";

interface AddGatekeeperFormProps {
  eventId: string;
  eventInfo: EventInfo;
  gatekeepers: string[];
}

export function AddGatekeeperForm({
  eventId,
  eventInfo,
  gatekeepers,
}: AddGatekeeperFormProps) {
  const { toast } = useToast();
  const { getToken } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { editEvent } = useEditEvent(getToken);

  const t = useTranslations("gatekeeper-management-dialog"); // TODO set name

  const [isPending, startTransition] = useTransition();
  const { data: communitiesPages } = useSuspenseInfiniteQuery(
    communitiesListByEvent(eventId, DEFAULT_COMMUNITIES_LIMIT),
  );
  const communities = useMemo(
    () => communitiesPages.pages.flat(),
    [communitiesPages],
  );

  const communityId =
    communities.length > 0
      ? communityIdFromPkgPath(communities[0].pkgPath)
      : null;

  const location = makeLocationFromEvent(eventInfo.location);

  const {
    handleSubmit,
    control,
    reset,
    formState: { isValid, isDirty, ...formState },
    ...rest
  } = useForm<EmailSchemaType>({
    mode: "all",
    resolver: zodResolver(
      emailSchema.refine((data) => !gatekeepers.includes(data.email), {
        message: t("error-gatekeeper-already-exists"),
        path: ["email"],
      }),
    ),
    defaultValues: { email: "" },
  });

  const onSubmit = (newGatekeeper: EmailSchemaType) => {
    startTransition(async () => {
      const values: EventFormSchemaType = {
        ...eventInfo,
        location,
        gatekeepers: [
          newGatekeeper,
          ...gatekeepers.map((gatekeeperEmail) => ({
            email: gatekeeperEmail,
          })),
        ],
        exclusive: eventInfo.privacy?.eventPrivacy.case === "guarded",
        password: "",
        communityId: communityId || null,
      };

      console.log("Submitting:", values.gatekeepers);

      try {
        await editEvent({ ...values, eventId });
        trackEvent("EventGatekeepersUpdated", {
          props: {
            eventId,
          },
        });
        reset();
        toast({
          title: t("toast-gatekeeper-management-success"),
        });
      } catch (err) {
        captureException(err);
        toast({
          variant: "destructive",
          title: t("toast-gatekeeper-management-error"),
        });
      }
    });
  };

  return (
    <Form
      {...{
        control,
        reset,
        handleSubmit,
        formState: { isDirty, isValid, ...formState },
        ...rest,
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-2 items-baseline">
          <FormFieldInputString
            control={control}
            name="email"
            placeholder={t("gatekeeper-email-placeholder")}
            className="w-96"
          />
          <Button
            type="submit"
            disabled={isPending || !isDirty || !isValid}
            className="h-12"
          >
            {t("add-gatekeeper-button")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
