"use client";

import { Url } from "next/dist/shared/lib/router/router";
import * as React from "react";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { DeletePostConfirmationDialog } from "@/components/dialogs/delete-post-confirmation-dialog";

type PostMenuProps = {
  gnowebHref?: Url;
  isOwner?: boolean;
  onEdit?: () => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  canEdit?: boolean;
  isDeleting?: boolean;
};

export function PostMenu({
  isOwner,
  gnowebHref,
  canEdit,
  onEdit,
  onDelete,
  isDeleting,
}: PostMenuProps) {
  const t = useTranslations("components.buttons");
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
          {gnowebHref && (
            <Link href={gnowebHref}>
              <DropdownMenuItem>{t("gnoweb-button")}</DropdownMenuItem>
            </Link>
          )}
          {isOwner && (
            <>
              {canEdit && onEdit && (
                <DropdownMenuItem onClick={onEdit}>Edit post</DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDialogOpen(true)}>
                Delete post
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
