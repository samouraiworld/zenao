"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { format, fromUnixTime, getUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import { FieldValues, useController } from "react-hook-form";
import { FormFieldProps } from "../types";
import { Button } from "@/components/shadcn/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { cn } from "@/lib/tailwind";
import { Calendar } from "@/components/shadcn/calendar";
import { ScrollArea, ScrollBar } from "@/components/shadcn/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import Text from "@/components/texts/text";

export const FormFieldDatePicker = <T extends FieldValues>(
  props: FormFieldProps<T, bigint> & { timeZone: string },
) => {
  const { field } = useController(props);

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      field.onChange(BigInt(getUnixTime(date)));
    }
  }

  function handleTimeChange(
    type: "hour" | "minute" | "ampm",
    value: string,
    currentDate: Date,
  ) {
    const newDate = new Date(currentDate);

    if (type === "hour") {
      const hour = parseInt(value, 10);
      newDate.setHours(newDate.getHours() >= 12 ? hour + 12 : hour);
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    } else if (type === "ampm") {
      const hours = newDate.getHours();
      if (value === "AM" && hours >= 12) {
        newDate.setHours(hours - 12);
      } else if (value === "PM" && hours < 12) {
        newDate.setHours(hours + 12);
      }
    }

    field.onChange(BigInt(getUnixTime(newDate)));
  }

  return (
    <FormField
      control={props.control}
      name={props.name}
      render={({ field }) => {
        const formattedValue = fromUnixTime(Number(field.value));
        return (
          <FormItem className="flex flex-col">
            <Popover>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full flex focus-visible:ring-0 border-none bg-inherit hover:bg-inherit h-auto p-0",
                      !formattedValue && "text-muted-foreground",
                      props.className,
                    )}
                  >
                    {field.value ? (
                      props.timeZone.length ? (
                        formatTZ(formattedValue, "MM/dd/yyyy hh:mm aa zzz", {
                          timeZone: props.timeZone,
                        })
                      ) : (
                        format(formattedValue, "MM/dd/yyyy hh:mm aa zzz")
                      )
                    ) : (
                      <Text size="sm" variant="secondary">
                        {props.placeholder}
                      </Text>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <div className="sm:flex">
                  <Calendar
                    mode="single"
                    selected={formattedValue}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date()}
                  />
                  <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                    <ScrollArea className="w-64 sm:w-auto">
                      <div className="flex sm:flex-col p-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1)
                          .reverse()
                          .map((hour) => (
                            <Button
                              key={hour}
                              size="icon"
                              variant={
                                formattedValue &&
                                formattedValue.getHours() % 12 === hour % 12
                                  ? "default"
                                  : "ghost"
                              }
                              className="sm:w-full shrink-0 aspect-square"
                              onClick={() =>
                                handleTimeChange(
                                  "hour",
                                  hour.toString(),
                                  formattedValue,
                                )
                              }
                            >
                              {hour}
                            </Button>
                          ))}
                      </div>
                      <ScrollBar
                        orientation="horizontal"
                        className="sm:hidden"
                      />
                    </ScrollArea>
                    <ScrollArea className="w-64 sm:w-auto">
                      <div className="flex sm:flex-col p-2">
                        {Array.from({ length: 12 }, (_, i) => i * 5).map(
                          (minute) => (
                            <Button
                              key={minute}
                              size="icon"
                              variant={
                                formattedValue &&
                                formattedValue.getMinutes() === minute
                                  ? "default"
                                  : "ghost"
                              }
                              className="sm:w-full shrink-0 aspect-square"
                              onClick={() =>
                                handleTimeChange(
                                  "minute",
                                  minute.toString(),
                                  formattedValue,
                                )
                              }
                            >
                              {minute.toString().padStart(2, "0")}
                            </Button>
                          ),
                        )}
                      </div>
                      <ScrollBar
                        orientation="horizontal"
                        className="sm:hidden"
                      />
                    </ScrollArea>
                    <ScrollArea className="">
                      <div className="flex sm:flex-col p-2">
                        {["AM", "PM"].map((ampm) => (
                          <Button
                            key={ampm}
                            size="icon"
                            variant={
                              formattedValue &&
                              ((ampm === "AM" &&
                                formattedValue.getHours() < 12) ||
                                (ampm === "PM" &&
                                  formattedValue.getHours() >= 12))
                                ? "default"
                                : "ghost"
                            }
                            className="sm:w-full shrink-0 aspect-square"
                            onClick={() =>
                              handleTimeChange("ampm", ampm, formattedValue)
                            }
                          >
                            {ampm}
                          </Button>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
