import { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shadcn/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { UserAvatarWithName } from "@/components/features/user/user";
import { SafeCommunityEntityWithRoles } from "@/types/schemas";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";

interface UseMembersColumnsProps {
  onDelete?: (userId: string) => void;
}

export const useMembersColumns = (
  props?: UseMembersColumnsProps,
): ColumnDef<SafeCommunityEntityWithRoles>[] => {
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
      ...(props?.onDelete
        ? [
            {
              id: "actions",
              header: () => <div>{t("actions-column")}</div>,
              cell: ({
                row,
              }: {
                row: { original: SafeCommunityEntityWithRoles };
              }) => (
                <Tooltip delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="p-0 size-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onDelete!(row.original.entityId);
                      }}
                    >
                      <Trash2 className="text-muted-foreground w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("action-tooltip-delete")}</TooltipContent>
                </Tooltip>
              ),
              enableHiding: false,
              enableSorting: false,
              meta: {
                className: "flex justify-end items-center px-4",
              },
            } satisfies ColumnDef<SafeCommunityEntityWithRoles>,
          ]
        : []),
    ],
    [t, props],
  );

  return columns;
};
