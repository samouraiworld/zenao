"use client";

import { FieldValues } from "react-hook-form";
import React from "react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { FormFieldProps } from "@/types/schemas";

export const FormFieldInputString = <T extends FieldValues>({
  control,
  inputType = "text",
  name,
  className,
  label,
  placeholder,
  disabled,
  ...inputProps
}: FormFieldProps<T, string | undefined> & {
  inputType?: "password" | "text";
  label?: React.ReactNode;
  disabled?: boolean;
} & React.InputHTMLAttributes<HTMLInputElement>) => {
  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              placeholder={placeholder || "placeholder..."}
              type={inputType}
              disabled={disabled}
              {...inputProps}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
