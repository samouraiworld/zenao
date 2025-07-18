"use client";

import { useTranslations } from "next-intl";
import EmptyList from "@/components/widgets/lists/empty-list";

function CommunityMembers() {
  const t = useTranslations();

  return (
    <>
      <div className="space-y-4">
        <EmptyList
          title={t("no-members-title")}
          description={t("no-members-description")}
        />
      </div>
      {/* <div className="py-4">
        <LoaderMoreButton
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetching={isFetching}
          isFetchingNextPage={isFetchingNextPage}
          page={members}
          noMoreLabel={t("no-more-members")}
        />
      </div> */}
    </>
  );
}

export default CommunityMembers;
