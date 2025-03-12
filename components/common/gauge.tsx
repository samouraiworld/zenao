import { cn } from "@/lib/tailwind";

export function Gauge({
  percent,
  className,
}: {
  percent: number;
  className?: string;
}) {
  return (
    <div className={cn("flex w-full h-10 rounded-lg bg-muted", className)}>
      <div
        className="rounded-lg h-full bg-gray-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
