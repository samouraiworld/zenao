"use client";

import { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Checkbox } from "@/components/shadcn/checkbox";
import { FormFieldProps } from "@/types/schemas";

export function FormFieldCheckbox<T extends FieldValues>({
  control,
  name,
  className,
  label,
  placement = "left",
}: FormFieldProps<T, boolean> & {
  label?: string;
  placement?: "left" | "right";
}) {
  const checkboxId = `checkbox-${name}`;
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div className="flex flex-row items-center gap-2">
              {placement === "left" ? (
                <>
                  <Checkbox
                    id={checkboxId}
                    checked={field.value}
                    className={className}
                    onCheckedChange={field.onChange}
                  />
                  <FormLabel htmlFor={checkboxId} className="cursor-pointer">
                    {label}
                  </FormLabel>
                </>
              ) : (
                <>
                  <FormLabel htmlFor={checkboxId} className="cursor-pointer">
                    {label}
                  </FormLabel>
                  <Checkbox
                    id={checkboxId}
                    checked={field.value}
                    className={className}
                    onCheckedChange={field.onChange}
                  />
                </>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
