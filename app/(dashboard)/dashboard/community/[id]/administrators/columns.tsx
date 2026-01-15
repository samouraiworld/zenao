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
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";

interface UseCommunityAdministratorsColumnsProps {
  onDelete: (email: string) => void;
  canBeDeleted: boolean;
}

export const useCommunityAdministratorsColumns = (
  props: UseCommunityAdministratorsColumnsProps,
): ColumnDef<string>[] => {
  const t = useTranslations("dashboard.communitiyAdministratorsTable");

  const columns = useMemo<ColumnDef<string>[]>(
    () => [
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("email-column")} />
        ),
        cell: ({ row }) => <div>{row.original}</div>,
        enableHiding: false,
        enableSorting: true,
        meta: {
          className: "px-4",
        },
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("actions-column")} />
        ),
        cell: ({ row }) => (
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className="p-0 size-8"
                onClick={() => props.onDelete(row.original)}
                disabled={!props.canBeDeleted}
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
      },
    ],
    [t, props],
  );

  return columns;
};
