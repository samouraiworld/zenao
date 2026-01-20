"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import Text from "@/components/widgets/texts/text";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
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
  requireEmail: boolean;
  totalMinor: bigint | null;
};

export function PaidPurchaseForm({
  attendeeCount,
  buyerEmail,
  checkoutPrice,
  eventTitle,
  isPending,
  maxGuests,
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

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-md border border-neutral-200 bg-neutral-50 p-5">
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
                  className="h-8 w-8 rounded border border-neutral-300 text-lg disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="h-8 w-8 rounded border border-neutral-300 text-lg disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={t("checkout-quantity-increase")}
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <Text className="text-sm text-neutral-600">
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
                <div className="flex h-12 items-center rounded border border-neutral-200 bg-white px-3 text-sm text-neutral-700">
                  {buyerEmail || t("checkout-buyer-fallback")}
                </div>
              )}
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col gap-2">
                <Text className="text-sm text-neutral-600">
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
          {t("checkout-button")}
        </ButtonWithChildren>
      </div>
    </div>
  );
}
