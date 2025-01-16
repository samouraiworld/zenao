"use client";

import { FormFieldProps } from "./types";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Input } from "@/components/shadcn/input";

export const FormFieldInputString: React.FC<FormFieldProps<string>> = ({
  control,
  name,
}) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{name}</FormLabel>
          <FormControl>
            <Input placeholder={`${name}...`} {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
