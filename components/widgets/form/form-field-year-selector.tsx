"use client";

import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "@/types/schemas";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/shadcn/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

interface FormFieldYearSelectorProps<T extends FieldValues>
  extends FormFieldProps<T, number> {
  label?: string;
  className?: string;
  disabled?: boolean;
}

export default function FormFieldYearSelector<T extends FieldValues>({
  control,
  label,
  name,
  className,
  disabled = false,
}: FormFieldYearSelectorProps<T>) {
  return (
    <FormField
      name={name}
      control={control}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <Select
            onValueChange={(value) => field.onChange(Number(value))}
            value={field.value?.toString()}
            disabled={disabled}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Year" defaultValue={field.value} />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {Array.from({ length: 100 }, (_, i) => {
                const year = new Date().getFullYear() - i;
                return (
                  <SelectItem
                    key={year}
                    value={year.toString()}
                    onSelect={() => field.onChange(year)}
                  >
                    {year}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
