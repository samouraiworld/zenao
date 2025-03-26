"use client";

import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { cn } from "@/lib/tailwind";

export const FormFieldInputNumber = <T extends FieldValues>({
  control,
  name,
  className,
  placeholder,
  label,
}: FormFieldProps<T, number> & { label?: string }) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              type="number"
              min={0}
              className={cn(
                "peer",
                // "focus-visible:ring-0 border-none h-auto p-0 placeholder:text-secondary-color",
                className,
              )}
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
