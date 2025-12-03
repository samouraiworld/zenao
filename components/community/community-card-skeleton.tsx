import { AspectRatio } from "../shadcn/aspect-ratio";
import { Skeleton } from "../shadcn/skeleton";
import { Card } from "../widgets/cards/card";
import CommunityMembersPreviewFallback from "./community-members-preview-fallback";

export default function CommunityCardSkeleton() {
  return (
    <Card className="flex flex-col gap-2 bg-secondary/50 hover:bg-secondary/100">
      <div className="flex gap-4">
        <div className="min-w-[128px]">
          <AspectRatio ratio={1 / 1}>
            <Skeleton className="flex w-full h-full rounded" />
          </AspectRatio>
        </div>

        <div className="flex flex-col gap-2">
          <Skeleton className="w-72 h-[2.10rem]" />
          <Skeleton className="w-48 h-[1.25rem]" />

          <CommunityMembersPreviewFallback />
        </div>
      </div>
    </Card>
  );
}
