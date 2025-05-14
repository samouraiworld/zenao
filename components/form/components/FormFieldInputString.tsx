"use client";

import { FieldValues } from "react-hook-form";
import React from "react";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";

export const FormFieldInputString = <T extends FieldValues>({
  control,
  inputType = "text",
  name,
  className,
  label,
  placeholder,
}: FormFieldProps<T, string | undefined> & {
  label?: React.ReactNode;
  inputType?: "password" | "text";
}) => {
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
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
