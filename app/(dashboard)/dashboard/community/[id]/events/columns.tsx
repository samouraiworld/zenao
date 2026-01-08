import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { UserAvatarWithName } from "@/components/features/user/user";
import { SafeEventInfo } from "@/types/schemas";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";

export const useCommunityEventsColumns = (): ColumnDef<SafeEventInfo>[] => {
  const t = useTranslations("dashboard.communitiyEventsTable");

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
            {formatTZ(fromUnixTime(Number(row.original.startDate)), "PPp O")}
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
        cell: ({ row }) => <Text size="sm">{row.original.title}</Text>,
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
            {row.original.participants}
          </Text>
        ),
      },
      {
        accessorKey: "organizers",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={t("organizers-column")}
          />
        ),
        cell: ({ row }) => (
          <div className="flex h-full items-center">
            <UserAvatarWithName userId={row.original.organizers[0]} />
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div>{t("actions-column")}</div>,
        cell: ({ row }) => (
          <Link href={`/event/${row.original.id}`} target="_blank">
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <Eye />
              <span className="sr-only">{t("view-event")}</span>
            </Button>
          </Link>
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
