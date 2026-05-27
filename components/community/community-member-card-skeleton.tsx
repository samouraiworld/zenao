import { Skeleton } from "../shadcn/skeleton";

function CommunityMemberCardSkeleton() {
  return (
    <div className="flex items-center gap-6 p-6 md:max-w-[600px] bg-secondary/50 hover:bg-secondary/100 transition rounded-xl">
      <Skeleton className="w-24 h-24 rounded-full" />

      <div className="flex flex-col justify-between flex-1 gap-3">
        <div>
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/4" />
        </div>
        <Skeleton className="h-3 w-3/4" />
        <div className="flex gap-2 flex-wrap">
          <Skeleton className="h-6 px-3 py-1" />
          <Skeleton className="h-6 px-3 py-1" />
        </div>
      </div>
    </div>
  );
}

export default CommunityMemberCardSkeleton;
