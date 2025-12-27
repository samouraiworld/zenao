"use client";

import * as React from "react";
import { EllipsisVertical } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { DeletePostConfirmationDialog } from "@/components/dialogs/delete-post-confirmation-dialog";

type PostMenuProps = {
  isAdmin?: boolean;
  isOwner?: boolean;
  onEdit?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  canEdit?: boolean;
  isDeleting?: boolean;
};

export function PostMenu({
  isAdmin,
  isOwner,
  canEdit,
  onEdit,
  onDelete,
  isDeleting,
}: PostMenuProps) {
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const onDeletePost = async () => {
    await onDelete?.();
    setDialogOpen(false);
  };

  if (!isOwner && !isAdmin) {
    return null;
  }

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
          {isOwner && (
            <>
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={onEdit}>Edit post</DropdownMenuItem>
              )}
            </>
          )}

          <DropdownMenuItem onClick={() => setDialogOpen(true)}>
            Delete post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
