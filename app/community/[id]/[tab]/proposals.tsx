"use client";

import { useTranslations } from "next-intl";
import EmptyList from "@/components/widgets/lists/empty-list";

function CommunityProposals() {
  const t = useTranslations();

  return (
    <div className="space-y-8">
      <EmptyList
        title={t("no-proposals-title")}
        description={t("no-proposals-description")}
      />
    </div>
  );
}

export default CommunityProposals;
