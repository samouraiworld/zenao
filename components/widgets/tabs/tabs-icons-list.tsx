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
            <Tooltip key={tab.id}>
              <TooltipTrigger type="button">
                <TabsTrigger
                  value={tab.id}
                  onClick={() => onValueChange?.(tab.id)}
                >
                  {tab.icon}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>{tab.tooltip}</TooltipContent>
            </Tooltip>
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
