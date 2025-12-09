import { Skeleton } from "@/components/shadcn/skeleton";

export default function DashboardEventDescriptionLoading() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4" />
      <Skeleton className="h-4" />
      <Skeleton className="h-4" />
      <Skeleton className="h-4" />
      <Skeleton className="h-4 w-5" />
    </div>
  );
}
