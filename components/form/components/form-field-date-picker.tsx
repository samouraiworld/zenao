"use client";

import { FieldValues, useController } from "react-hook-form";
import React, { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, fromUnixTime, getUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import { Matcher } from "react-day-picker";
import { useEffect } from "react";
import { useRef } from "react";
import { FormFieldProps } from "../types";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/tailwind";
import { Calendar } from "@/components/shadcn/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { ScrollArea } from "@/components/shadcn/scroll-area";
import { SmallText } from "@/components/texts/SmallText";

export function FormFieldDatePickerV2<T extends FieldValues>(
  props: FormFieldProps<T, bigint> & {
    timeZone: string;
    dateRangeMatcher?: Matcher | Matcher[];
  },
) {
  const { field } = useController({ ...props });
  const [isOpen, setIsOpen] = useState(false);
  const firstCheck = useRef(0);
  const [time, setTime] = useState<string>("09:00");

  useEffect(() => {
    if (firstCheck.current > 0) return;

    firstCheck.current += 1;

    if (field.value) {
      const formattedValue = fromUnixTime(Number(field.value));

      const hours = formattedValue.getHours().toString().padStart(2, "0");
      const minutes = formattedValue.getMinutes().toString().padStart(2, "0");

      setTime(`${hours}:${minutes}`);
    }
  }, [field.value, firstCheck]);

  return (
    <div className="flex w-full gap-4">
      <FormField
        control={props.control}
        name={props.name}
        render={({ field }) => {
          const formattedValue = fromUnixTime(Number(field.value));
          return (
            <FormItem className="flex flex-col w-full">
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
                        props.timeZone.length ? (
                          formatTZ(formattedValue, "MM/dd/yyyy", {
                            timeZone: props.timeZone,
                          })
                        ) : (
                          format(formattedValue, "MM/dd/yyyy")
                        )
                      ) : (
                        <SmallText variant="secondary">
                          {props.placeholder}
                        </SmallText>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    selected={
                      !Number.isNaN(formattedValue.getTime())
                        ? formattedValue
                        : undefined
                    }
                    onSelect={(selectedDate) => {
                      const [hours, minutes] = time.split(":")!;
                      selectedDate?.setHours(
                        parseInt(hours),
                        parseInt(minutes),
                      );
                      if (selectedDate) {
                        field.onChange(BigInt(getUnixTime(selectedDate)));
                      }
                    }}
                    onDayClick={() => setIsOpen(false)}
                    disabled={props.dateRangeMatcher}
                    defaultMonth={
                      !Number.isNaN(formattedValue.getTime())
                        ? formattedValue
                        : undefined
                    }
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          );
        }}
      />
      <FormField
        control={props.control}
        name={props.name}
        render={({ field }) => {
          const formattedValue = fromUnixTime(Number(field.value));
          return (
            <FormItem className="flex flex-col">
              <FormControl>
                <Select
                  disabled={!field.value}
                  defaultValue={time}
                  onValueChange={(e) => {
                    setTime(e);
                    if (field.value) {
                      const [hours, minutes] = e.split(":");
                      const newDate = new Date(formattedValue);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      field.onChange(BigInt(getUnixTime(newDate)));
                    }
                  }}
                >
                  <SelectTrigger className="font-normal focus:ring-0 w-[120px] focus:ring-offset-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="h-[15rem]">
                      {Array.from({ length: 96 }).map((_, i) => {
                        const hour = Math.floor(i / 4)
                          .toString()
                          .padStart(2, "0");
                        const minute = ((i % 4) * 15)
                          .toString()
                          .padStart(2, "0");
                        return (
                          <SelectItem key={i} value={`${hour}:${minute}`}>
                            {hour}:{minute}
                          </SelectItem>
                        );
                      })}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </FormControl>
            </FormItem>
          );
        }}
      />
    </div>
  );
}
