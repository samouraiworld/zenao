"use client";

import { fromUnixTime, formatDistanceStrict } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import React, { useState } from "react";
import { useNow } from "next-intl";
import Text, { type TextProps } from "@/components/widgets/texts/text";
import { useLayoutTimezone } from "@/hooks/use-layout-timezone";

interface DateTimeTextProps extends Omit<TextProps, "children"> {
  datetime: bigint;
}

// A datetime Text that can toggles the display between the full datetime or distance from now
export function DateTimeText({ datetime, ...textProps }: DateTimeTextProps) {
  const [isFullDatetime, setIsFullDatetime] = useState(false);
  const timeZone = useLayoutTimezone();
  const now = useNow();
  return (
    <div
      className="cursor-pointer hover:opacity-50"
      onClick={() => setIsFullDatetime((isFullDatetime) => !isFullDatetime)}
    >
      <Text {...textProps}>
        {isFullDatetime
          ? formatTZ(fromUnixTime(Number(datetime)), "Pp", { timeZone })
          : formatDistanceStrict(now, fromUnixTime(Number(datetime)))}
      </Text>
    </div>
  );
}
