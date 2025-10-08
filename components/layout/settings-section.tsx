import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../shadcn/tooltip";
import Heading from "../widgets/texts/heading";

interface SettingsSectionProps {
  title: string;
  description?: string;
  tooltip?: React.ReactNode;
  children: React.ReactNode;
}

export default function SettingsSection({
  title,
  description,
  tooltip,
  children,
}: SettingsSectionProps) {
  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row gap-2">
          <Heading level={3}>{title}</Heading>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger>
                <Info
                  size={16}
                  className="text-muted-foreground transition-colors"
                />
              </TooltipTrigger>
              <TooltipContent>{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
