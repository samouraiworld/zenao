"use client";

import { useTranslations } from "next-intl";
import { Suspense } from "react";
import CommunitiesTableViewLoading from "./communities-table-view-loading";
import CommunitiesTable from "./communities-table";
import Heading from "@/components/widgets/texts/heading";

export default function CommunitiesPageLayout() {
  const t = useTranslations("dashboard.communitiesTable");

  return (
    <div className="flex flex-col gap-6">
      <Heading level={1} className="text-2xl">
        {t("communities")}
      </Heading>

      <div className="flex flex-col gap-4">
        <Suspense fallback={<CommunitiesTableViewLoading />}>
          <CommunitiesTable />
        </Suspense>
      </div>
    </div>
  );
}
