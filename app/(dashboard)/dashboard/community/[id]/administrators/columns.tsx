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

interface UseCommunityAdministratorsColumnsProps {
  onDelete: (email: string) => void;
  canBeDeleted: boolean;
}

export const useCommunityAdministratorsColumns = (
  props: UseCommunityAdministratorsColumnsProps,
): ColumnDef<string>[] => {
  const t = useTranslations(
    "dashboard.communityDetails.administrators.columns",
  );
  const columns = useMemo<ColumnDef<string>[]>(
    () => [
      {
        accessorKey: "email",
        header: () => <div>{t("email")}</div>,
        cell: ({ row }) => <div>{row.original}</div>,
        enableHiding: false,
        enableSorting: true,
        meta: {
          className: "px-4",
        },
      },
      {
        id: "actions",
        header: () => <div>{t("actions")}</div>,
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
            <TooltipContent>{t("delete-admin")}</TooltipContent>
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
