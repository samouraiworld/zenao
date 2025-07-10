"use client";

import { format, formatDistanceToNowStrict, fromUnixTime } from "date-fns";
import React, { useState } from "react";
import Text, { type TextProps } from "@/components/widgets/texts/text";

interface DateTimeTextProps extends Omit<TextProps, "children"> {
  datetime: bigint;
}
// A datetime Text that can toggles the display between the full datetime or formatDistanceToNowStrict datetime
export function DateTimeText({ datetime, ...textProps }: DateTimeTextProps) {
  const [isFullDatetime, setIsFullDatetime] = useState(false);
  return (
    <div
      className="cursor-pointer hover:opacity-50"
      onClick={() => setIsFullDatetime((isFullDatetime) => !isFullDatetime)}
    >
      {isFullDatetime ? (
        <Text {...textProps}>
          {format(fromUnixTime(Number(datetime)), "Pp")}
        </Text>
      ) : (
        <Text {...textProps}>
          {formatDistanceToNowStrict(fromUnixTime(Number(datetime)))}
        </Text>
      )}
    </div>
  );
}
