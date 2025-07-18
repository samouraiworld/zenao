"use client";

import { useTranslations } from "next-intl";
import EmptyList from "@/components/widgets/lists/empty-list";

type CommunityPostsProps = {
  communityId: string;
};

function CommunityPosts({ communityId: _ }: CommunityPostsProps) {
  const t = useTranslations();
  return (
    <>
      <div className="space-y-4">
        <EmptyList
          title={t("no-posts-title")}
          description={t("no-posts-description")}
        />
      </div>
      {/* <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={posts}
          noMoreLabel={t("no-more-posts")}
        />
      </div> */}
    </>
  );
}

export default CommunityPosts;
