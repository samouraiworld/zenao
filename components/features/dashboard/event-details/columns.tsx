import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { UserAvatarWithName } from "../../user/user";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Button } from "@/components/shadcn/button";

export const useParticipantsColumns = (): ColumnDef<string>[] => {
  const columns = useMemo<ColumnDef<string>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => <div className="px-4">Name</div>,
        cell: ({ row }) => (
          <div className="px-4">
            <UserAvatarWithName
              realmId={row.original}
              className="h-10"
              linkToProfile
            />
          </div>
        ),
        enableHiding: false,
        enableSorting: true,
      },
    ],
    [],
  );

  return columns;
};

export const useGatekeepersColumns = (): ColumnDef<string>[] => {
  const columns = useMemo<ColumnDef<string>[]>(
    () => [
      {
        accessorKey: "email",
        header: () => <div>Email</div>,
        cell: ({ row }) => <div>{row.original}</div>,
        enableHiding: false,
        enableSorting: true,
        meta: {
          className: "px-4",
        },
      },
      {
        id: "actions",
        header: () => <div>Actions</div>,
        cell: () => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <EllipsisVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem>
                <Link href={`#`}>View</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableHiding: false,
        enableSorting: false,
        meta: {
          className: "flex justify-end items-center px-4",
        },
      },
    ],
    [],
  );

  return columns;
};
