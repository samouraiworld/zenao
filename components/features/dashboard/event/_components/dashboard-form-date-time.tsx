"use client";

import { useTranslations } from "next-intl";
import { useFormContext } from "react-hook-form";
import {
  fromUnixTime,
  getUnixTime,
  hoursToMinutes,
  isSameDay,
  minutesToSeconds,
} from "date-fns";
import { EventFormSchemaType } from "@/types/schemas";
import { FormFieldDatePicker } from "@/components/widgets/form/form-field-date-picker";
import { locationTimezone } from "@/lib/event-location";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";
import { FormDescription } from "@/components/shadcn/form";

interface DashboardFormDateTimeProps {
  minDateRange?: Date;
  maxDateRange?: Date;
}

export default function DashboardFormDateTime({
  minDateRange,
  maxDateRange,
}: DashboardFormDateTimeProps) {
  const form = useFormContext<EventFormSchemaType>();
  const t = useTranslations("eventForm");

  const startDate = form.watch("startDate");
  const endDate = form.watch("endDate");
  const location = form.watch("location");
  const eventTimezone = locationTimezone(location);
  const timeZone = useLayoutTimezone(eventTimezone);

  return (
    <>
      <div className="grid grid-cols-1 gap-6">
        <FormFieldDatePicker
          name="startDate"
          label={t("from")}
          control={form.control}
          placeholder={t("pick-a-start-date-placeholder")}
          timeZone={timeZone}
          onChange={(date: Date) => {
            if (!endDate || date > fromUnixTime(Number(endDate))) {
              form.setValue(
                "endDate",
                BigInt(getUnixTime(date) + minutesToSeconds(15)),
              );
            }
          }}
          disabledDates={[
            ...(minDateRange
              ? [
                  {
                    before: minDateRange,
                  },
                ]
              : []),
            ...(maxDateRange
              ? [
                  {
                    after: maxDateRange,
                  },
                ]
              : []),
          ]}
          disabledHours={[
            ...(minDateRange
              ? [
                  {
                    before: minDateRange,
                  },
                ]
              : []),
          ]}
        />
        <FormFieldDatePicker
          name="endDate"
          label={t("to")}
          control={form.control}
          placeholder={t("pick-a-end-date-placeholder")}
          timeZone={timeZone}
          disabled={!startDate}
          disabledHours={[
            (date: Date) => {
              if (startDate) {
                // We accept events on the same day
                const currentStartDate = fromUnixTime(Number(startDate));

                return (
                  isSameDay(currentStartDate, date) &&
                  hoursToMinutes(currentStartDate.getHours()) +
                    currentStartDate.getMinutes() +
                    15 /* Event duration 15 minutes minimum */ >
                    date.getHours() * 60 + date.getMinutes()
                );
              }

              return false;
            },
          ]}
          disabledDates={[
            ...(minDateRange
              ? [
                  {
                    before: minDateRange,
                  },
                ]
              : []),
            ...(maxDateRange
              ? [
                  {
                    after: maxDateRange,
                  },
                ]
              : []),
            (date: Date) => {
              if (startDate) {
                // We accept events on the same day
                const currentStartDate = fromUnixTime(Number(startDate));

                return (
                  !isSameDay(currentStartDate, date) && currentStartDate > date
                );
              }

              return false;
            },
          ]}
        />
        <FormDescription>
          {t("displayed-timezone", { timeZone })}
        </FormDescription>
      </div>
    </>
  );
}
