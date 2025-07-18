"use client";

import { useTranslations } from "next-intl";
import EmptyList from "@/components/widgets/lists/empty-list";

function CommunityProposals() {
  const t = useTranslations();

  return (
    <>
      <div className="space-y-4">
        <EmptyList
          title={t("no-proposals-title")}
          description={t("no-proposals-description")}
        />
      </div>
      {/* <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={proposals}
          noMoreLabel={t("no-more-proposals")}
        />
      </div> */}
    </>
  );
}

export default CommunityProposals;
