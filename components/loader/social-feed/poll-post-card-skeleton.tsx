import { Card } from "@/components/cards/Card";
import { UserAvatarSkeleton } from "@/components/common/user";
import { Skeleton } from "@/components/shadcn/skeleton";

export function PollPostCardSkeleton() {
  return (
    <Card className="w-full flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-start gap-2">
        <div className="w-full flex flex-row gap-3">
          <UserAvatarSkeleton className="flex cursor-pointer size-8 transition-transform ease-out" />

          <div className="flex flex-col gap-1 w-full">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 w-full sm:justify-end">
          <div className="flex flex-row items-center gap-2">
            {Array.from({ length: 3 }, (_, i) => i + 1).map((i) => (
              <div
                className="flex flex-row items-center gap-0.5 cursor-pointer hover:opacity-50"
                key={i}
              >
                <Skeleton className="h-3 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="my-1 w-full flex flex-col gap-6">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-64" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
      </div>
    </Card>
  );
}
