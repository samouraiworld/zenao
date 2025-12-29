"use client";

import * as React from "react";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { DeletePostConfirmationDialog } from "@/components/dialogs/delete-post-confirmation-dialog";

type PostMenuProps = {
  isOwner?: boolean;
  onEdit?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onPinToggle?: () => void | Promise<void>;
  pinned?: boolean;
  canEdit?: boolean;
  canPin?: boolean;
  isDeleting?: boolean;
  isPinning?: boolean;
};

export function PostMenu({
  isOwner,
  canEdit,
  onEdit,
  onDelete,
  onPinToggle,
  pinned,
  canPin,
  isDeleting,
  isPinning,
}: PostMenuProps) {
  const tPostMenu = useTranslations("post-menu");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const onDeletePost = async () => {
    await onDelete?.();
    setDialogOpen(false);
  };

  return (
    <>
      <DeletePostConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onDelete={onDeletePost}
        isDeleting={isDeleting}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="px-2">
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-36">
          {canPin && onPinToggle && (
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={onPinToggle}
              disabled={isDeleting || isPinning}
            >
              {pinned ? tPostMenu("unpin-post") : tPostMenu("pin-post")}
            </DropdownMenuItem>
          )}
          {isOwner && (
            <>
              {canEdit && onEdit && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={onEdit}
                  disabled={isDeleting || isPinning}
                >
                  {tPostMenu("edit-post")}
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuItem
            onClick={() => setDialogOpen(true)}
            disabled={isDeleting || isPinning}
          >
            {tPostMenu("delete-post")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
