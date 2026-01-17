"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { UserAvatarWithName } from "@/components/features/user/user";
import { SafeCommunityEntityWithRoles } from "@/types/schemas";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";

export const useMembersColumns =
  (): ColumnDef<SafeCommunityEntityWithRoles>[] => {
    const t = useTranslations("dashboard.membersTable");

    const columns = useMemo<ColumnDef<SafeCommunityEntityWithRoles>[]>(
      () => [
        {
          id: "name",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t("name-column")} />
          ),
          cell: ({ row }) => {
            if (row.original.entityType !== "user") {
              return <div className="px-4">Unknown Entity</div>;
            }

            return (
              <div className="px-4">
                <UserAvatarWithName
                  userId={row.original.entityId}
                  className="h-10"
                  linkToProfile
                />
              </div>
            );
          },
          enableHiding: false,
          enableSorting: true,
        },
        {
          accessorKey: "Roles",
          header: ({ column }) => (
            <DataTableColumnHeader column={column} title={t("roles-column")} />
          ),
          cell: ({ row }) => (
            <div className="flex flex-wrap gap-1">
              {row.original.roles.map((role) => (
                <span
                  key={role}
                  className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-color"
                >
                  {role}
                </span>
              ))}
            </div>
          ),
          enableSorting: true,
        },
      ],
      [t],
    );

    return columns;
  };
