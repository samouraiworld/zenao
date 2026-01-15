"use client";

import { useFieldArray, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { CurrencyOption, PriceFieldSet } from "./price-field-set";
import { FormField } from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { FormFieldInputNumber } from "@/components/widgets/form/form-field-input-number";
import { cn } from "@/lib/tailwind";
import { EventFormSchemaType } from "@/types/schemas";

type PriceGroupFieldSetProps = {
  form: UseFormReturn<EventFormSchemaType>;
  groupIndex: number;
  currencyOptions: CurrencyOption[];
  disabled?: boolean;
  className?: string;
};

export const PriceGroupFieldSet = ({
  form,
  groupIndex,
  currencyOptions,
  disabled = false,
  className,
}: PriceGroupFieldSetProps) => {
  const { fields: priceFields } = useFieldArray({
    control: form.control,
    name: `pricesGroups.${groupIndex}.prices` as const,
  });

  const t = useTranslations("eventForm");
  const rows = priceFields.length > 0 ? priceFields : [{ id: "fallback" }];

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <FormField
        control={form.control}
        name={`pricesGroups.${groupIndex}.id` as const}
        render={({ field }) => <Input type="hidden" {...field} />}
      />
      <FormField
        control={form.control}
        name={`pricesGroups.${groupIndex}.name` as const}
        render={({ field }) => <Input type="hidden" {...field} />}
      />

      {rows.map((row, priceIndex) => (
        <div key={row.id ?? priceIndex} className="grid gap-4 md:grid-cols-3">
          <PriceFieldSet
            form={form}
            groupIndex={groupIndex}
            priceIndex={priceIndex}
            currencyOptions={currencyOptions}
            disabled={disabled}
            className="md:col-span-2"
          />
          {priceIndex === 0 ? (
            <FormFieldInputNumber
              control={form.control}
              name="capacity"
              // TODO: When multiple price groups are supported, bind capacity per group instead of event capacity.
              placeholder={t("capacity-placeholder")}
              label={t("capacity-price-label")}
              min={1}
            />
          ) : (
            <div className="hidden md:block" />
          )}
        </div>
      ))}
    </div>
  );
};
