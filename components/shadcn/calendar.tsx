"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, Dropdown as DropDownDayPicker } from "react-day-picker";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { ScrollArea } from "./scroll-area";
import { cn } from "@/lib/tailwind";
import { buttonVariants } from "@/components/shadcn/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  dropdownsClassName?: string;
};

function Calendar({
  className,
  classNames,
  hideNavigation,
  showOutsideDays = true,
  components: customComponents,
  ...props
}: CalendarProps) {
  const _dropdownsClassName = cn(
    "flex items-center justify-center gap-2 w-full",
    hideNavigation ? "w-full" : "",
    props.dropdownsClassName,
  );

  const Dropdown = React.useCallback(
    ({
      value,
      onChange,
      options,
      "aria-label": arialLabel,
    }: React.ComponentProps<typeof DropDownDayPicker>) => {
      console.log(options);
      const selected = options?.find((option) => option.value === value);
      const handleChange = (value: string) => {
        const changeEvent = {
          target: { value },
        } as React.ChangeEvent<HTMLSelectElement>;
        onChange?.(changeEvent);
      };
      return (
        <Select
          value={value?.toString()}
          onValueChange={(value) => {
            handleChange(value);
          }}
        >
          <SelectTrigger
            className="outline-none focus:ring-0 focus:ring-offset-0"
            aria-label={arialLabel}
          >
            <SelectValue>{selected?.label}</SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" align="center">
            <ScrollArea className="h-80">
              {options?.map(({ value, label, disabled }, id) => (
                <SelectItem
                  key={`${value}-${id}`}
                  value={value?.toString()}
                  disabled={disabled}
                >
                  {label}
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      );
    },
    [],
  );

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      hideNavigation
      classNames={{
        month: "space-y-4",
        months: "flex flex-col sm:flex-row space-y-4 sm:space-y-0 relative",
        month_caption: "flex justify-center pt-1 relative items-center",
        month_grid: "w-full border-collapse space-y-1",
        caption_label: "text-sm font-medium",
        // nav: "flex items-center justify-between absolute inset-x-0",
        nav: "hidden",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 z-10",
        ),
        dropdowns: _dropdownsClassName,
        weeks: "w-full border-collapse space-y-",
        weekdays: "flex",
        weekday:
          "text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day_button:
          "h-7 w-8 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-7 w-8 p-0 font-normal aria-selected:opacity-100",
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
        today: "bg-accent text-accent-foreground",
        outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Dropdown,
        Chevron: ({ className, ...props }) => {
          if (props.orientation === "left") {
            return (
              <ChevronLeft className={cn("h-4 w-4", className)} {...props} />
            );
          }
          return (
            <ChevronRight className={cn("h-4 w-4", className)} {...props} />
          );
        },
        ...customComponents,
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
