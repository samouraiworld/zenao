import { HTMLAttributes } from "react";
import { Separator } from "@/components/shadcn/separator";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";
interface EventSectionProps {
  title: string;
  children?: React.ReactNode;
}

export function EventSection({
  title,
  children,
  className,
  ...props
}: EventSectionProps & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col", className)} {...props}>
      <Text className="font-semibold">{title}</Text>
      <Separator className="mt-2 mb-3" />
      {children}
    </div>
  );
}
