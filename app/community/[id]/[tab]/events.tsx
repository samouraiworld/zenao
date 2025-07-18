"use client";

import { useTranslations } from "next-intl";
import EmptyList from "@/components/widgets/lists/empty-list";

function CommunityEvents() {
  const t = useTranslations();

  return (
    <>
      <div className="space-y-4">
        <EmptyList
          title={t("no-events-title")}
          description={t("no-events-description")}
        />
      </div>
      {/* <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={posts}
          noMoreLabel={t("no-more-events")}
        />
      </div> */}
    </>
  );
}

export default CommunityEvents;
