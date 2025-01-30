"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import { format, fromUnixTime, getUnixTime } from "date-fns";
import { UseFormReturn } from "react-hook-form";
import { Matcher } from "react-day-picker";
import { EventFormSchemaType, FormFieldProps } from "../types";
import { Button } from "@/components/shadcn/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/shadcn/calendar";
import { ScrollArea, ScrollBar } from "@/components/shadcn/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { SmallText } from "@/components/texts/SmallText";

export const FormFieldDatePicker: React.FC<
  Omit<FormFieldProps<bigint>, "control"> & {
    form: UseFormReturn<EventFormSchemaType>;
    // disabled: disabled before/after a date with Matcher format (ex: date < new Date() )
    disabled: (date: Date) => boolean;
  }
> = ({ name, className, placeholder, form, disabled }) => {
  function handleDateSelect(date: Date | undefined) {
    if (date) {
      form.setValue(name, BigInt(getUnixTime(date)));
    }
  }

  function timeChange(
    type: "hour" | "minute" | "ampm",
    value: string,
    currentDate: Date,
  ) {
    const newDate = new Date(currentDate);
    console.log("newDate", newDate);

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

    return newDate;
  }

  function handleTimeChange(
    type: "hour" | "minute" | "ampm",
    value: string,
    currentDate: Date,
  ) {
    form.setValue(
      name,
      BigInt(getUnixTime(timeChange(type, value, currentDate))),
    );
  }

  function testTimeChange(
    type: "hour" | "minute" | "ampm",
    value: string,
    currentDate: Date,
  ) {
    return disabled(timeChange(type, value, currentDate));
  }

  return (
    <FormField
      control={form.control}
      name={name}
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
                      className,
                    )}
                  >
                    {field.value ? (
                      format(formattedValue, "MM/dd/yyyy hh:mm aa")
                    ) : (
                      <SmallText variant="secondary">{placeholder}</SmallText>
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
                    disabled={disabled}
                  />
                  <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
                    <ScrollArea className="w-64 sm:w-auto">
                      <div className="flex sm:flex-col p-2">
                        {Array.from({ length: 12 }, (_, i) => i + 1)
                          .reverse()
                          .map((hour) => (
                            <Button
                              disabled={testTimeChange(
                                "hour",
                                hour.toString(),
                                formattedValue,
                              )}
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
                              disabled={testTimeChange(
                                "minute",
                                minute.toString(),
                                formattedValue,
                              )}
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
                            disabled={testTimeChange(
                              "ampm",
                              ampm,
                              formattedValue,
                            )}
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
