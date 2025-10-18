"use client";

import { fromUnixTime } from "date-fns";
import React, { useState } from "react";
import { useFormatter } from "next-intl";
import Text, { type TextProps } from "@/components/widgets/texts/text";

interface DateTimeTextProps extends Omit<TextProps, "children"> {
  datetime: bigint;
}

// A datetime Text that can toggles the display between the full datetime or formatDistanceToNowStrict datetime
export function DateTimeText({ datetime, ...textProps }: DateTimeTextProps) {
  const format = useFormatter();
  const [isFullDatetime, setIsFullDatetime] = useState(false);
  return (
    <div
      className="cursor-pointer hover:opacity-50"
      onClick={() => setIsFullDatetime((isFullDatetime) => !isFullDatetime)}
    >
      <Text {...textProps}>
        {isFullDatetime
          ? format.dateTime(fromUnixTime(Number(datetime)), {
              dateStyle: "short",
              timeStyle: "short",
            })
          : format.relativeTime(fromUnixTime(Number(datetime)))}
      </Text>
    </div>
  );
}
