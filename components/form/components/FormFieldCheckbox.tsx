"use client";

import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { CheckboxWithLabel } from "@/components/common/Checkbox";

export const FormFieldCheckbox = <T extends FieldValues & { label?: string }>({
  control,
  name,
  className,
  label,
}: FormFieldProps<T, string>) => {
  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <div
              onClick={() => field.onChange(!field.value)}
              className="hover:cursor-pointer"
            >
              <CheckboxWithLabel
                checked={field.value}
                className={className}
                label={label}
              />
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
