import { Columns2, SquarePen } from "lucide-react";
import { TabIconItem } from "@/components/widgets/tabs/tabs-icons-list";

export const getMarkdownEditorTabs = ({
  writeLabel,
  previewLabel,
}: {
  writeLabel: string;
  previewLabel: string;
}): TabIconItem[] => {
  return [
    {
      id: "write",
      icon: <SquarePen className="size-4" />,
      tooltip: writeLabel,
    },
    {
      id: "preview",
      icon: <Columns2 className="size-4" />,
      tooltip: previewLabel,
    },
  ];
};
