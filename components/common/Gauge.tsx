import { cn } from "@/lib/tailwind";

export const Gauge: React.FC<{
  percent: number;
  className?: string;
}> = ({ percent, className }) => {
  return (
    <div className={cn("flex w-full h-10 rounded-lg bg-muted", className)}>
      <div
        className="rounded-lg h-full bg-gray-700"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
};
