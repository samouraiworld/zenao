import { Badge } from "../shadcn/badge";
import Text from "./texts/text";
import { cn } from "@/lib/tailwind";

export default function VersionTag({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn("rounded", className)}>
      <Text size="sm" variant="secondary">
        Beta{" "}
        <span className="hidden sm:inline">{process.env.NEXT_APP_VERSION}</span>
      </Text>
    </Badge>
  );
}
