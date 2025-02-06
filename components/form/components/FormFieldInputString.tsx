"use client";

import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";
import { cn } from "@/lib/tailwind";

export const FormFieldInputString: React.FC<FormFieldProps<string>> = ({
  control,
  name,
  className,
  placeholder,
}) => {
  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Input
              className={cn(
                "focus-visible:ring-0 border-none h-auto p-0 placeholder:text-secondary-color",
                className,
              )}
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
