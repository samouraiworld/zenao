"use client";

import { FieldValues } from "react-hook-form";
import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, fromUnixTime, getUnixTime } from "date-fns";
import { FormFieldProps } from "../types";
import { FormControl, FormField, FormItem } from "@/components/shadcn/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/tailwind";
import { Calendar } from "@/components/shadcn/calendar";

export function FormFieldDatePickerV2<T extends FieldValues>(
  props: FormFieldProps<T, bigint> & { timeZone: string },
) {
  const [isOpen, setIsOpen] = useState(false);
  // const { field } = useController(props);

  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const formattedValue = fromUnixTime(Number(field.value));

        return (
          <FormItem className="flex flex-col">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full font-normal",
                      !field.value && "text-muted-foreground",
                    )}
                  >
                    {field.value ? (
                      format(formattedValue, "dd mm yyyy")
                    ) : (
                      <span>Pick a date</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto max-auto p-0" align="start">
                <Calendar
                  mode="single"
                  captionLayout="dropdown"
                  selected={formattedValue}
                  onSelect={(selectedDate) => {
                    // const [hours, minutes] = time.split(":")!;
                    // selectedDate?.setHours(parseInt(hours), parseInt(minutes));
                    if (selectedDate) {
                      field.onChange(BigInt(getUnixTime(selectedDate)));
                    }
                  }}
                  onDayClick={() => setIsOpen(false)}
                  // disabled={(date) =>
                  //   Number(date) < Date.now() - 1000 * 60 * 60 * 24 ||
                  //   Number(date) > Date.now() + 1000 * 60 * 60 * 24 * 30
                  // }
                  defaultMonth={formattedValue}
                />
              </PopoverContent>
            </Popover>
          </FormItem>
        );
      }}
    />
  );
}
