import { Loader2 } from "lucide-react";
import { ScreenContainerCentered } from "@/components/layout/screen-container";

export default function DashboardEventLoading() {
  return (
    <ScreenContainerCentered>
      <Loader2 className="animate-spin w-6 h-6" />
    </ScreenContainerCentered>
  );
}
