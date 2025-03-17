"use client";

import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { Checkbox } from "@/components/shadcn/checkbox";
import { SmallText } from "@/components/texts/SmallText";
import { Label } from "@/components/shadcn/label";

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
            <div className="flex flex-row items-center justify-between">
              <Label
                htmlFor={checkboxId}
                className="hover:cursor-pointer w-full"
              >
                <SmallText>{label}</SmallText>
              </Label>
              <Checkbox
                id={checkboxId}
                checked={field.value}
                className={className}
                onChange={() => field.onChange(!field.value)}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
