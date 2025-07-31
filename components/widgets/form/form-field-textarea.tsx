"use client";

import React, { RefObject } from "react";
import { FieldValues, useFormContext } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Textarea } from "@/components/shadcn/textarea";
import { cn } from "@/lib/tailwind";
import Text from "@/components/widgets/texts/text";
import { mergeRefs } from "@/lib/utils";
import { FormFieldProps } from "@/types/schemas";

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
  label,
  ref,
  ...otherProps
}: FormFieldTextAreaProps<T> & {
  label?: string;
  ref?: RefObject<HTMLTextAreaElement | null>;
}) => {
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

  const { getFieldState, formState } = useFormContext<T>();
  const fieldState = getFieldState(name, formState);

  return (
    <FormField
      rules={{ required: true }}
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn("relative w-full", wordCounter ? "pb-6" : null)}
        >
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Textarea
              className={cn(
                "resize-none break-words min-h-[48px] max-h-[400px]",
                className,
              )}
              placeholder={placeholder}
              {...otherProps}
              {...field}
              onChange={(e) => {
                field.onChange(e.target.value);
                adjustHeight();
              }}
              ref={mergeRefs(ref, textAreaRef)}
            />
          </FormControl>
          {(fieldState.error || wordCounter) && (
            <div
              className={cn(
                "flex w-full justify-between",
                wordCounter ? "absolute bottom-0" : null,
              )}
            >
              <FormMessage />
              {wordCounter && (
                <>
                  <div />
                  <Text size="sm" className="text-primary-color/80">
                    <span>{field.value.length}</span> /
                    <span>{otherProps.maxLength}</span>
                  </Text>
                </>
              )}
            </div>
          )}
        </FormItem>
      )}
    />
  );
};
