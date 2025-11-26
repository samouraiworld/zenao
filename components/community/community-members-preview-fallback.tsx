import { Skeleton } from "../shadcn/skeleton";

export default function CommunityMembersPreviewFallback() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="w-24 h-6" />
      <Skeleton className="w-20 h-[1rem] md:h-[1.25rem]" />
      <Skeleton className="w-36 h-[1.25rem]" />
    </div>
  );
}
