"use client";

import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PaidPurchaseForm } from "./paid-purchase-form";
import { FreeRegistrationForm } from "./free-registration-form";
import { Form } from "@/components/shadcn/form";
import {
  useEventParticipateGuest,
  useEventParticipateLoggedIn,
} from "@/lib/mutations/event-participate";
import { useEventCheckout } from "@/lib/mutations/event-checkout";
import { useToast } from "@/hooks/use-toast";
import { eventOptions } from "@/lib/queries/event";
import { captureException } from "@/lib/report";
import { emailSchema, SafeEventPriceGroup } from "@/types/schemas";
import { userInfoOptions } from "@/lib/queries/user";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

const buildEventRegistrationFormSchema = (
  requireEmail: boolean,
  maxGuests: number,
) =>
  z.object({
    email: requireEmail ? z.string().email() : z.string().email().optional(),
    guests: z.array(emailSchema).max(Math.max(maxGuests, 0)),
  });

export type EventRegistrationFormSchemaType = z.infer<
  ReturnType<typeof buildEventRegistrationFormSchema>
>;

type EventRegistrationFormProps = {
  eventId: string;
  eventPassword: string;
  onGuestRegistrationSuccess?: (email: string) => void;
};

export type SubmitStatusInvitee = Record<
  `emails.${number}.email`,
  "loading" | "error" | "success"
>;

type CheckoutPrice = SafeEventPriceGroup["prices"][number];

const selectCheckoutPrice = (
  groups: SafeEventPriceGroup[],
): CheckoutPrice | null => {
  const prices = groups.flatMap((group) => group.prices);
  const paidPrices = prices.filter((price) => price.amountMinor > BigInt(0));
  if (paidPrices.length === 0) {
    return null;
  }
  return paidPrices.reduce((current, price) =>
    price.amountMinor < current.amountMinor ? price : current,
  );
};

export function EventRegistrationForm({
  eventId,
  eventPassword,
  onGuestRegistrationSuccess,
}: EventRegistrationFormProps) {
  const { trackEvent } = useAnalyticsEvents();
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const { data } = useSuspenseQuery(eventOptions(eventId));
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userProfileId = userInfo?.userId || "";
  const { toast } = useToast();

  const [isPending, setIsPending] = useState(false);
  const { participate: participateLoggedIn } = useEventParticipateLoggedIn();
  const { participate: participateGuest } = useEventParticipateGuest();
  const { startCheckout } = useEventCheckout();

  const t = useTranslations("event");
  const checkoutPrice = useMemo(
    () => selectCheckoutPrice(data.pricesGroups),
    [data.pricesGroups],
  );
  const isPaidEvent = checkoutPrice != null;
  const requireEmail = !userId;
  const buyerEmail = user?.primaryEmailAddress?.emailAddress ?? "";
  const maxGuests = data.capacity - data.participants - 1;
  const formSchema = useMemo(
    () => buildEventRegistrationFormSchema(requireEmail, maxGuests),
    [requireEmail, maxGuests],
  );
  const form = useForm<EventRegistrationFormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: requireEmail ? "" : undefined,
      guests: [],
    },
  });
  const emailValue = useWatch({ control: form.control, name: "email" });
  const guestsValue = useWatch({ control: form.control, name: "guests" });
  const buyerIsCounted = userId ? buyerEmail !== "" : !!emailValue;
  const attendeeCount =
    (buyerIsCounted ? 1 : 0) + (guestsValue ? guestsValue.length : 0);
  const totalMinor =
    checkoutPrice && attendeeCount > 0
      ? checkoutPrice.amountMinor * BigInt(attendeeCount)
      : null;

  const onSubmit = async (data: EventRegistrationFormSchemaType) => {
    const guests = data.guests.reduce<string[]>((acc, e) => {
      acc.push(e.email);
      return acc;
    }, []);

    setIsPending(true);

    try {
      if (isPaidEvent && checkoutPrice) {
        const token = await getToken();
        if (!token) {
          throw new Error("invalid clerk token");
        }

        const attendeeEmails: string[] = [];
        if (userId) {
          if (buyerEmail) {
            attendeeEmails.push(buyerEmail);
          }
        } else if (data.email) {
          attendeeEmails.push(data.email);
        }
        attendeeEmails.push(...guests);
        // TODO: Support multiple price selections so totals match chosen line items.
        const checkoutPath = `${window.location.pathname}${window.location.search}`;
        const response = await startCheckout({
          eventId,
          lineItems: attendeeEmails.map((email) => ({
            priceId: checkoutPrice.id,
            attendeeEmail: email,
          })),
          password: eventPassword,
          successPath: checkoutPath,
          cancelPath: checkoutPath,
          token: token,
        });

        trackEvent("EventCheckoutStarted", {
          props: {
            eventId,
            quantity: attendeeEmails.length,
          },
        });

        window.location.assign(response.checkoutUrl);
        return;
      }

      if (userId) {
        // Authenticated
        const token = await getToken();
        if (!token) {
          throw new Error("invalid clerk token");
        }
        if (!userId || !userProfileId) {
          throw new Error("missing user id or user address");
        }

        await participateLoggedIn({
          eventId,
          token,
          userId: userProfileId,
          guests,
          password: eventPassword,
        });

        trackEvent("EventParticipation", {
          props: {
            eventId,
            method: "loggedIn",
          },
        });
      } else {
        // Guest
        await participateGuest({
          eventId,
          email: data.email!,
          guests,
          userId: userProfileId,
          password: eventPassword,
        });
        trackEvent("EventParticipation", {
          props: {
            eventId,
            method: "guest",
          },
        });
        onGuestRegistrationSuccess?.(data.email!);
      }
      setIsPending(false);
      toast({ title: t("toast-confirmation") });
      form.reset();
    } catch (err) {
      if (isPaidEvent) {
        // TODO: Add pre-check UI for sold-out/held capacity before checkout submission.
        const message = err instanceof Error ? err.message : "";
        const isSoldOut = message.includes("sold out");
        toast({
          variant: "destructive",
          title: isSoldOut ? t("sold-out-msg") : t("checkout-error-title"),
          description: t("checkout-error-note"),
        });
        setIsPending(false);
        return;
      }
      if (
        err instanceof Error &&
        err.message !== "[unknown] user is already participant for this event"
      ) {
        captureException(err);
      }
      toast({
        variant: "destructive",
        title:
          err instanceof Error &&
          err.message === "[unknown] user is already participant for this event"
            ? t("toast-already-registered-error")
            : t("toast-default-error"),
      });
    }
    setIsPending(false);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {isPaidEvent && checkoutPrice ? (
          <PaidPurchaseForm
            attendeeCount={attendeeCount}
            buyerEmail={buyerEmail}
            checkoutPrice={checkoutPrice}
            eventTitle={data.title}
            isPending={isPending}
            maxGuests={maxGuests}
            requireEmail={requireEmail}
            totalMinor={totalMinor}
          />
        ) : (
          <FreeRegistrationForm
            isPending={isPending}
            requireEmail={requireEmail}
            userId={userId}
          />
        )}
      </form>
    </Form>
  );
}
