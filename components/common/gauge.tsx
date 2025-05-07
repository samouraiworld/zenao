"use client";

import { cn } from "@/lib/tailwind";

export function Gauge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full h-10 rounded-lg", className)}>
      <div
        className="rounded-lg h-full bg-[#EC7E17]/30"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
