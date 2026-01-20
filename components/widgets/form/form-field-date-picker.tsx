"use client";

import { FieldValues, useController } from "react-hook-form";
import React, { useMemo, useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format, fromUnixTime, getUnixTime, minutesToSeconds } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import { DateInterval, DateRange, Matcher } from "react-day-picker";
import { useTranslations } from "next-intl";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import Text from "@/components/widgets/texts/text";
import { FormFieldProps } from "@/types/schemas";

function isDateDisabled(date: Date, matcher: Matcher): boolean {
  if (!matcher) return false;

  if (typeof matcher === "boolean") return matcher;

  // If it's a date, check for direct equality
  if (matcher instanceof Date) {
    return date.getTime() === matcher.getTime();
  }

  // If it's an array, check if any matcher in the array applies
  if (Array.isArray(matcher)) {
    return matcher.some((m) => isDateDisabled(date, m));
  }

  // If it's a function, call it
  if (typeof matcher === "function") {
    return matcher(date);
  }

  // If it's a DateRange, check if the date falls within the range
  if ("from" in matcher && "to" in matcher) {
    const { from, to } = matcher as DateRange;
    return from && to ? date >= from && date <= to : false;
  }

  // If it's a DateInterval, check interval conditions
  if ("before" in matcher || "after" in matcher) {
    const { before, after } = matcher as DateInterval;
    return (before ? date < before : true) && (after ? date > after : true);
  }

  return false;
}

export function FormFieldDatePicker<T extends FieldValues>(
  props: FormFieldProps<T, bigint> & {
    timeZone: string;
    disabled?: boolean;
    disabledDates?: Matcher | Matcher[];
    disabledHours?: Matcher | Matcher[];
    onChange?: (date: Date) => void;
    label?: string;
  },
) {
  const tA11y = useTranslations("a11y");
  const { field } = useController({
    name: props.name,
    control: props.control,
  });
  const [isOpen, setIsOpen] = useState(false);

  const defaultTime = useMemo(() => {
    let formattedValue: Date;

    if (field.value) {
      formattedValue = fromUnixTime(Number(field.value));

      const hours = formattedValue.getHours().toString().padStart(2, "0");
      const minutes = formattedValue.getMinutes().toString().padStart(2, "0");

      return `${hours}:${minutes}`;
    }
    // Default time
    formattedValue = fromUnixTime(Date.now() / 1000 + minutesToSeconds(15));
    const { hour, minute } = roundToNearestQuarter(
      formattedValue.getHours(),
      formattedValue.getMinutes(),
    );

    const hours = hour.toString().padStart(2, "0");
    const minutes = minute.toString().padStart(2, "0");

    return `${hours}:${minutes}`;
  }, [field.value]);

  const isTimeDisabled = React.useCallback(
    (date: Date, hours: number, minutes: number) => {
      if (!props.disabledHours) {
        return false;
      }

      if (isNaN(date.getTime())) {
        return true;
      }

      const newDate = new Date(date);

      newDate.setHours(hours);
      newDate.setMinutes(minutes);

      const disabled = Array.isArray(props.disabledHours)
        ? props.disabledHours.reduce<boolean>(
            (acc, matcher) => acc || isDateDisabled(newDate, matcher),
            false,
          )
        : isDateDisabled(newDate, props.disabledHours);

      return disabled;
    },
    [props.disabledHours],
  );

  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const formattedValue = fromUnixTime(Number(field.value));

        return (
          <div className="flex flex-col w-full gap-2">
            {props.label && <FormLabel>{props.label}</FormLabel>}
            <div className="flex w-full gap-4">
              <FormItem className="flex w-full">
                <Popover open={isOpen} onOpenChange={setIsOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="input"
                        aria-label={tA11y("pick-date")}
                        disabled={props.disabled}
                        className={cn(
                          "w-full",
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
                          <Text variant="secondary">{props.placeholder}</Text>
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
                        const [hours, minutes] = defaultTime.split(":")!;
                        selectedDate?.setHours(
                          parseInt(hours),
                          parseInt(minutes),
                        );
                        if (selectedDate) {
                          const value = BigInt(getUnixTime(selectedDate));
                          field.onChange(value);
                          if (props.onChange) {
                            props.onChange(selectedDate);
                          }
                        }
                      }}
                      fromYear={new Date().getFullYear()}
                      toYear={new Date().getFullYear() + 10}
                      onDayClick={() => setIsOpen(false)}
                      disabled={props.disabledDates}
                      defaultMonth={
                        !Number.isNaN(formattedValue.getTime())
                          ? formattedValue
                          : undefined
                      }
                    />
                  </PopoverContent>
                </Popover>
              </FormItem>

              <FormItem className="flex flex-col">
                <FormControl>
                  <Select
                    disabled={props.disabled || !field.value}
                    defaultValue={defaultTime}
                    value={defaultTime}
                    onValueChange={(e) => {
                      if (field.value) {
                        const [hours, minutes] = e.split(":");
                        const newDate = new Date(formattedValue);
                        newDate.setHours(parseInt(hours), parseInt(minutes));
                        field.onChange(BigInt(getUnixTime(newDate)));
                        if (props.onChange) {
                          props.onChange(newDate);
                        }
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
                            <SelectItem
                              key={i}
                              value={`${hour}:${minute}`}
                              disabled={
                                props.disabledHours
                                  ? isTimeDisabled(
                                      formattedValue,
                                      parseInt(hour),
                                      parseInt(minute),
                                    )
                                  : undefined
                              }
                            >
                              {hour}:{minute}
                            </SelectItem>
                          );
                        })}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            </div>
            <FormMessage />
          </div>
        );
      }}
    />
  );
}

function roundToNearestQuarter(
  hour: number,
  minute: number,
): { hour: number; minute: number } {
  let roundedMinutes = Math.round(minute / 15) * 15;

  if (roundedMinutes === 60) {
    hour = (hour + 1) % 24; // Handle 24-hour wraparound
    roundedMinutes = 0;
  }

  return { hour, minute: roundedMinutes };
}
