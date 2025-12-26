import { Loader2 } from "lucide-react";

export default function DashboardEventGatekeepersLoadingPage() {
  return (
    <div className="flex w-full h-12 justify-center items-center">
      <Loader2 className="animate-spin h-6 w-6" />
    </div>
  );
}
