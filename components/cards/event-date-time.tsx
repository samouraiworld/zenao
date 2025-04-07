import { fromUnixTime } from "date-fns";
import { format as formatTZ } from "date-fns-tz";
import React from "react";
import Text from "../texts/text";

const EventDateTime = ({
  startDate,
  timezone,
}: {
  startDate: bigint;
  timezone: string;
}) => {
  return (
    <Text variant="secondary">
      {formatTZ(fromUnixTime(Number(startDate)), "p O", {
        timeZone: timezone,
      })}
    </Text>
  );
};

export default EventDateTime;
