"use client";

import React from "react";
import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "../types";
import { FormControl, FormField, FormItem } from "@/components/shadcn/form";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/tailwind";

export const FormFieldTextArea = <T extends FieldValues>({
  control,
  name,
  className,
  placeholder,
  ...otherProps
}: FormFieldProps<T, string> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "inherit";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, []);

  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Textarea
              className={cn(
                "resize-none break-words border-0 text-sm focus-visible:ring-transparent p-0 w-full min-h-[52px] max-h-[400px] placeholder:text-secondary-color",
                className,
              )}
              placeholder={placeholder || "placeholder..."}
              {...otherProps}
              {...field}
              onChange={(e) => {
                field.onChange(e.target.value);
                adjustHeight();
              }}
              ref={textAreaRef}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
};
