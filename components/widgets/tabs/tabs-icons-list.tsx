import { TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";

export interface TabIconItem {
  id: string;
  icon: React.ReactNode;
  tooltip?: React.ReactNode;
}

interface TabsIconsListProps {
  className?: string;
  style?: React.CSSProperties;
  tabs: TabIconItem[];
  onValueChange?: (value: string) => void;
}

export default function TabsIconsList({
  tabs,
  className,
  style,
  onValueChange,
}: TabsIconsListProps) {
  return (
    <TabsList tabIndex={-1} className={className} style={style}>
      {tabs.map((tab) => {
        if (tab.tooltip) {
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              onClick={() => onValueChange?.(tab.id)}
            >
              <Tooltip key={tab.id}>
                <TooltipTrigger type="button" asChild>
                  {tab.icon}
                </TooltipTrigger>
                <TooltipContent>{tab.tooltip}</TooltipContent>
              </Tooltip>
            </TabsTrigger>
          );
        }

        return (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            onClick={() => onValueChange?.(tab.id)}
          >
            {tab.icon}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );
}
