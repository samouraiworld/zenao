"use client";

import React from "react";
import { FieldValues } from "react-hook-form";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/tailwind";
import { SmallText } from "@/components/texts/SmallText";

type FormFieldTextAreaProps<T extends FieldValues> = FormFieldProps<T, string> &
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    wordCounter?: boolean;
  };

export const FormFieldTextArea = <T extends FieldValues>({
  control,
  name,
  className,
  placeholder,
  wordCounter,
  ...otherProps
}: FormFieldTextAreaProps<T>) => {
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

  console.log(otherProps.maxLength);
  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="relative">
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
          <FormMessage />
          {wordCounter && (
            <div className="absolute right-1 bottom-0">
              <SmallText className="text-foreground/80">
                <span>{field.value.length}</span> /
                <span>{otherProps.maxLength}</span>
              </SmallText>
            </div>
          )}
        </FormItem>
      )}
    />
  );
};
