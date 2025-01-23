"use client";

import React from "react";
import { FormFieldProps } from "../types";
import { FormControl, FormField, FormItem } from "@/components/shadcn/form";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/utils";

export const FormFieldTextArea: React.FC<FormFieldProps<string>> = ({
  control,
  name,
  className,
  placeholder,
}) => {
  const textAreaRef = React.useRef<HTMLTextAreaElement>(null);

  const adjustHeight = () => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "inherit";
      textAreaRef.current.style.height = `${textAreaRef.current.scrollHeight}px`;
    }
  };

  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormControl>
            <Textarea
              maxLength={140}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // method to prevent from default behaviour
                  e.preventDefault();
                }
              }}
              className={cn(
                "resize-none break-words border-0 focus-visible:ring-transparent overflow-hidden p-0 w-full min-h-[52px]",
                className,
              )}
              placeholder={placeholder || "placeholder..."}
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
