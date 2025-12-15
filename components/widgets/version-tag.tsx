import packageJson from "../../package.json";
import { Badge } from "../shadcn/badge";
import Text from "./texts/text";
import { cn } from "@/lib/tailwind";

export default function VersionTag({ className }: { className?: string }) {
  return (
    <Badge variant="secondary" className={cn("rounded", className)}>
      <Text size="sm" variant="secondary">
        Beta <span className="hidden sm:inline">{packageJson.version}</span>
      </Text>
    </Badge>
  );
}
