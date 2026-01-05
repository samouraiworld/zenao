"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";
import useCommunitiesTableColumns from "./columns";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { DEFAULT_COMMUNITIES_LIMIT } from "@/lib/queries/community";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { SafeCommunityUser } from "@/types/schemas";

interface CommunitiesTableViewProps {
  communities: SafeCommunityUser[];
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  fetchNextPage: () => void;
  fetchPreviousPage: () => void;
}

export default function CommunitiesTableView({
  communities,
  isFetchingNextPage,
  isFetchingPreviousPage,
  hasNextPage,
  hasPreviousPage,
  fetchNextPage,
  fetchPreviousPage,
}: CommunitiesTableViewProps) {
  const router = useRouter();
  const columns = useCommunitiesTableColumns();
  const t = useTranslations("dashboard.communitiesTable");
  const table = useDataTableInstance({
    data: communities,
    columns,
    enableRowSelection: false,
    defaultPageSize: DEFAULT_COMMUNITIES_LIMIT,
    getRowId: (row) => row.community.id.toString(),
  });

  return (
    <>
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">{t("no-communities")}</Text>
                <Link href="/dashboard/community/create">
                  <Button size="sm">
                    <Plus />
                    {t("create-community-btn")}
                  </Button>
                </Link>
              </div>
            )}
            onClickRow={(row) => {
              router.push(`/dashboard/community/${row.original.community.id}`);
            }}
          />
        </div>
      </div>
      <DataTablePagination
        table={table}
        manuelPagination={{
          isFetchingNext: isFetchingNextPage,
          isFetchingPrevious: isFetchingPreviousPage,
          hasNextPage,
          hasPreviousPage,
          fetchNextPage,
          fetchPreviousPage,
        }}
      />
    </>
  );
}
