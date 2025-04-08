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
import { Checkbox } from "@/components/shadcn/checkbox";

export function FormFieldCheckbox<T extends FieldValues>({
  control,
  name,
  className,
  label,
}: FormFieldProps<T, boolean> & { label?: string }) {
  const checkboxId = `checkbox-${name}`;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="flex flex-row items-center gap-2">
              <FormLabel className="cursor-pointer">{label}</FormLabel>
              <Checkbox
                id={checkboxId}
                checked={field.value}
                className={className}
                onCheckedChange={field.onChange}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
