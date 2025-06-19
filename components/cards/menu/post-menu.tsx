"use client";

import { Url } from "next/dist/shared/lib/router/router";
import * as React from "react";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { userAddressOptions } from "@/lib/queries/user";
import { DeletePostConfirmationDialog } from "@/components/dialogs/delete-post-confirmation-dialog";

type PostMenuProps = {
  eventId: string;
  postId: bigint;
  gnowebHref?: Url;
  author: string;
  onDeleteSuccess?: () => void;
};

export function PostMenu({
  eventId,
  author,
  postId,
  gnowebHref,
  onDeleteSuccess,
}: PostMenuProps) {
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const t = useTranslations("components.buttons");
  const [dialogOpen, setDialogOpen] = React.useState(false);

  return (
    <>
      <DeletePostConfirmationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        eventId={eventId}
        postId={postId}
        onSuccess={onDeleteSuccess}
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
          {author === userAddress && (
            <DropdownMenuItem onClick={() => setDialogOpen(true)}>
              Delete post
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
