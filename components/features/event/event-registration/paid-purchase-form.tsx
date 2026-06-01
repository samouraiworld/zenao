"use client";

import Link from "next/link";
import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import Text from "@/components/widgets/texts/text";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { Button } from "@/components/shadcn/button";
import { formatPrice } from "@/lib/pricing";
import { EventRegistrationFormSchemaType } from "@/components/features/event/event-registration/index";
import { SafeEventPriceGroup } from "@/types/schemas";

type CheckoutPrice = SafeEventPriceGroup["prices"][number];

type PaidPurchaseFormProps = {
  attendeeCount: number;
  buyerEmail: string;
  checkoutPrice: CheckoutPrice;
  eventTitle: string;
  isPending: boolean;
  maxGuests: number;
  pendingOrderId?: string;
  requireEmail: boolean;
  totalMinor: number | null;
};

export function PaidPurchaseForm({
  attendeeCount,
  buyerEmail,
  checkoutPrice,
  eventTitle,
  isPending,
  maxGuests,
  pendingOrderId,
  requireEmail,
  totalMinor,
}: PaidPurchaseFormProps) {
  const t = useTranslations("event");
  const { control } = useFormContext<EventRegistrationFormSchemaType>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "guests",
  });

  const canAddGuest = fields.length < Math.max(maxGuests, 0);
  const canRemoveGuest = fields.length > 0;

  const onAddGuest = () => {
    if (!canAddGuest) return;
    append({ email: "" });
  };

  const onRemoveGuest = () => {
    if (!canRemoveGuest) return;
    remove(fields.length - 1);
  };

  const checkoutButtonLabel = pendingOrderId
    ? t("checkout-button-continue")
    : t("checkout-button");

  return (
    <div className="flex flex-col gap-6">
      {pendingOrderId ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text className="text-sm text-amber-800 dark:text-amber-100">
              {t("pending-order-notice")}
            </Text>
            <Link href={`/order/${pendingOrderId}`}>
              <Button variant="outline" size="sm" type="button">
                {t("pending-order-link")}
              </Button>
            </Link>
          </div>
        </div>
      ) : null}
      <div className="rounded border border-border bg-secondary/50 p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Text className="text-lg font-medium">{eventTitle}</Text>
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <Text variant="secondary">{t("checkout-total-label")}</Text>
                <Text className="font-medium">
                  {totalMinor == null
                    ? "--"
                    : formatPrice(totalMinor, checkoutPrice.currencyCode, {
                        freeLabel: t("price-free"),
                      })}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onRemoveGuest}
                  disabled={!canRemoveGuest || isPending}
                  className="h-8 w-8 rounded border border-border text-lg transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  aria-label={t("checkout-quantity-decrease")}
                >
                  -
                </button>
                <Text className="min-w-[1.5rem] text-center">
                  {attendeeCount}
                </Text>
                <button
                  type="button"
                  onClick={onAddGuest}
                  disabled={!canAddGuest || isPending}
                  className="h-8 w-8 rounded border border-border text-lg transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                  aria-label={t("checkout-quantity-increase")}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Text variant="secondary" className="text-sm">
                {t("checkout-buyer-label")}
              </Text>
              {requireEmail ? (
                <FormFieldInputString
                  control={control}
                  disabled={isPending}
                  name="email"
                  placeholder={t("email-placeholder")}
                />
              ) : (
                <div className="flex h-12 items-center rounded border border-custom-input-border bg-custom-input-bg px-3 text-base text-foreground">
                  {buyerEmail || t("checkout-buyer-fallback")}
                </div>
              )}
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-2">
                <Text variant="secondary" className="text-sm">
                  {t("checkout-guest-label")}
                </Text>
                <FormFieldInputString
                  control={control}
                  disabled={isPending}
                  name={`guests.${index}.email`}
                  placeholder={t("email-placeholder")}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <ButtonWithChildren loading={isPending} type="submit">
          {checkoutButtonLabel}
        </ButtonWithChildren>
      </div>
    </div>
  );
}
