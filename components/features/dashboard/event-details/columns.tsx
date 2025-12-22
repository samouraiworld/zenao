import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { UserAvatarWithName } from "../../user/user";

export const useParticipantsColumns = (): ColumnDef<string>[] => {
  const columns = useMemo<ColumnDef<string>[]>(
    () => [
      {
        id: "index",
        header: () => null,
        enableSorting: false,
        enableHiding: false,
        size: 24,
        maxSize: 24,
        cell: ({ row }) => <div className="ml-4">{row.index + 1}</div>,
      },
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => (
          <UserAvatarWithName
            realmId={row.original}
            className="h-10"
            linkToProfile
          />
        ),
        enableHiding: false,
        enableSorting: true,
      },
    ],
    [],
  );

  return columns;
};
