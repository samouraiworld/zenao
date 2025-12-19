"use client";

import { formatDate } from "date-fns";
import Text from "@/components/widgets/texts/text";

export default function PostDate({ date }: { date: Date }) {
  return <Text variant="secondary">{formatDate(date, "PPP")}</Text>;
}
