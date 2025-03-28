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
  name,
  className,
  label,
  placeholder,
}: FormFieldProps<T, string> & { label?: React.ReactNode }) => {
  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Input
              className={className}
              placeholder={placeholder || "placeholder..."}
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
