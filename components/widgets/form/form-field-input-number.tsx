"use client";

import { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { cn } from "@/lib/tailwind";
import { FormFieldProps } from "@/types/schemas";

export const FormFieldInputNumber = <T extends FieldValues>({
  control,
  name,
  className,
  placeholder,
  label,
  min,
  max,
}: FormFieldProps<T, number> & {
  label?: string;
  min?: number;
  max?: number;
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full">
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="number"
              min={min}
              max={max}
              className={cn("peer", className)}
              placeholder={placeholder}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
