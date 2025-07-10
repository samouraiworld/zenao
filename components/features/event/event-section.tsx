import { ReactNode } from "react";
import { Separator } from "@/components/shadcn/separator";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";

export function EventSection({
  title,
  children,
  className,
}: {
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Text className="font-semibold">{title}</Text>
      <Separator className="mt-2 mb-3" />
      {children}
    </div>
  );
}
