"use client";

import { parseAsInteger, useQueryStates } from "nuqs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMembersColumns } from "./columns";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import {
  communityUsersWithRoles,
  DEFAULT_COMMUNITY_MEMBERS_PAGE_LIMIT,
} from "@/lib/queries/community";
import Text from "@/components/widgets/texts/text";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import { useDashboardCommunityContext } from "@/components/providers/dashboard-community-context-provider";
import { useRemoveCommunityMember } from "@/lib/mutations/community-remove-member";
import { useToast } from "@/hooks/use-toast";
import { captureException } from "@/lib/report";
import ConfirmationDialog from "@/components/dialogs/confirmation-dialog";

export default function MembersTable() {
  const t = useTranslations("dashboard.communityDetails.members");
  const { communityId, roles } = useDashboardCommunityContext();
  const { getToken } = useAuth();
  const { toast } = useToast();

  const isAdmin = roles.includes("administrator");

  const { data: members } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["member"]),
  );

  const { removeCommunityMember, isPending } = useRemoveCommunityMember();
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(
    null,
  );

  const onDelete = useCallback((userId: string) => {
    setPendingDeleteUserId(userId);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeleteUserId) return;
    try {
      await removeCommunityMember({
        communityId,
        userId: pendingDeleteUserId,
        getToken,
      });
      toast({ title: t("toast-remove-member-success") });
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-remove-member-error"),
      });
    } finally {
      setPendingDeleteUserId(null);
    }
  }, [
    communityId,
    getToken,
    pendingDeleteUserId,
    removeCommunityMember,
    t,
    toast,
  ]);

  const [tablePagination, setTablePagination] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DEFAULT_COMMUNITY_MEMBERS_PAGE_LIMIT),
    },
    {
      scroll: false,
      clearOnDefault: true,
    },
  );

  const columns = useMembersColumns(isAdmin ? { onDelete } : undefined);
  const table = useDataTableInstance({
    data: members,
    columns,
    enableRowSelection: false,
    defaultPageSize:
      tablePagination.limit < 10
        ? tablePagination.limit
        : DEFAULT_COMMUNITY_MEMBERS_PAGE_LIMIT,
    defaultPageIndex:
      tablePagination.page - 1 >= 0 ? tablePagination.page - 1 : 0,
    getRowId: (row) => `${row.entityType}:${row.entityId}`,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">{t("no-members")}</Text>
              </div>
            )}
            onClickRow={(row) => {
              if (row.original.entityType !== "user") {
                return;
              }

              window.open(`/profile/${row.original.entityId}`, "_blank");
            }}
          />
        </div>
      </div>
      <DataTablePagination
        pagination={{
          page: tablePagination.page,
          limit: tablePagination.limit,
          setLimit: (newLimit) => {
            setTablePagination((prev) => ({
              ...prev,
              limit: newLimit,
            }));
          },
          setPage: (newPage) => {
            setTablePagination((prev) => ({
              ...prev,
              page: newPage,
            }));
          },
        }}
        table={table}
      />
      <ConfirmationDialog
        open={!!pendingDeleteUserId}
        onOpenChange={(open) => !open && setPendingDeleteUserId(null)}
        title={t("confirm-remove-member-title")}
        description={t("confirm-remove-member-description")}
        confirmText={t("confirm-remove-member-confirm")}
        onConfirm={handleConfirmDelete}
        isPending={isPending}
      />
    </div>
  );
}
