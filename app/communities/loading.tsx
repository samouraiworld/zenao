import CommunityCardSkeleton from "@/components/community/community-card-skeleton";

export default function CommunitiesLoadingPage() {
  return (
    <div className="flex flex-col gap-2">
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
      <CommunityCardSkeleton />
    </div>
  );
}
