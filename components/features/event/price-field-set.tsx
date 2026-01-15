"use client";

import { UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { FormFieldInputCurrency } from "@/components/widgets/form/form-field-input-currency";
import { FormFieldInputPriceNumber } from "@/components/widgets/form/form-field-input-price-number";
import { cn } from "@/lib/tailwind";
import { EventFormSchemaType } from "@/types/schemas";

export type CurrencyOption = {
  value: string;
  label: string;
};

type PriceFieldSetProps = {
  form: UseFormReturn<EventFormSchemaType>;
  groupIndex: number;
  priceIndex: number;
  currencyOptions: CurrencyOption[];
  disabled?: boolean;
  className?: string;
};

export const PriceFieldSet = ({
  form,
  groupIndex,
  priceIndex,
  currencyOptions,
  disabled = false,
  className,
}: PriceFieldSetProps) => {
  const t = useTranslations("eventForm");

  const emptyOptionValue = "__free__";
  const amountName =
    `pricesGroups.${groupIndex}.prices.${priceIndex}.amountMinor` as const;
  const currencyName =
    `pricesGroups.${groupIndex}.prices.${priceIndex}.currencyCode` as const;
  const priceIdName =
    `pricesGroups.${groupIndex}.prices.${priceIndex}.id` as const;
  const paymentAccountIdName =
    `pricesGroups.${groupIndex}.prices.${priceIndex}.paymentAccountId` as const;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <FormFieldInputPriceNumber
        control={form.control}
        name={amountName}
        currencyName={currencyName}
        className="w-full"
        label={t("price-label")}
        placeholder={t("price-placeholder")}
        disabled={disabled}
      />
      <FormFieldInputCurrency
        control={form.control}
        name={currencyName}
        label={t("currency-label")}
        emptyValue={emptyOptionValue}
        currencyOptions={currencyOptions}
        disabled={disabled}
      />

      <FormField
        control={form.control}
        name={priceIdName}
        render={({ field }) => <Input type="hidden" {...field} />}
      />
      <FormField
        control={form.control}
        name={paymentAccountIdName}
        render={({ field }) => <Input type="hidden" {...field} />}
      />
    </div>
  );
};
