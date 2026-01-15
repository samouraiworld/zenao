import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shadcn/button";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import Text from "@/components/widgets/texts/text";
import { SafeEventUser } from "@/types/schemas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

export const useEventsTableColumns: () => ColumnDef<SafeEventUser>[] = () => {
  const t = useTranslations("dashboard.eventsTable");

  return useMemo(
    () => [
      {
        accessorKey: "startDate",
        enableSorting: true,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("date-column")} />
        ),
        cell: ({ row }) => (
          <Text size="sm" variant="secondary">
            {formatTZ(
              fromUnixTime(Number(row.original.event.startDate)),
              "PPp O",
            )}
          </Text>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="w-full text-left"
            column={column}
            title={t("name-column")}
          />
        ),
        cell: ({ row }) => <Text size="sm">{row.original.event.title}</Text>,
        enableSorting: false,
        sortDescFirst: true,
      },
      {
        accessorKey: "participants",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("participants-column")}
          />
        ),
        cell: ({ row }) => (
          <Text size="sm" variant="secondary">
            {row.original.event.participants}
          </Text>
        ),
      },
      {
        accessorKey: "roles",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("roles-column")} />
        ),
        cell: ({ row }) => (
          <Text size="sm" variant="secondary">
            {row.original.roles.map((role) => role).join(", ")}
          </Text>
        ),
      },
      {
        id: "actions",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("actions-column")} />
        ),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <Eye />
                <span className="sr-only">{t("view-event")}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link href={`/dashboard/event/${row.original.event.id}`}>
                  {t("actions-menu.dashboard-view")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link href={`/event/${row.original.event.id}`} target="_blank">
                  {t("actions-menu.customer-view")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        meta: {
          className: "flex justify-end items-center px-4",
        },
      },
    ],
    [t],
  );
};
