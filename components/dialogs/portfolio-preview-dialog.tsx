"use client";

import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import React from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../shadcn/dialog";
import { Web3Image } from "../widgets/images/web3-image";
import { Button } from "../shadcn/button";
import { MarkdownPreview } from "../widgets/markdown-preview";
import ConfirmationDialog from "./confirmation-dialog";
import { PortfolioItem } from "@/types/schemas";
import { web2URL } from "@/lib/uris";
import { cn } from "@/lib/tailwind";

interface PortfolioPreviewDialogProps {
  isOpen: boolean;
  isAdmin?: boolean;
  onOpenChange: (open: boolean) => void;
  item: PortfolioItem;
  onDelete?: (item: PortfolioItem) => void | Promise<void>;
  isDeleting?: boolean;
}

export default function PortfolioPreviewDialog({
  isOpen,
  onOpenChange,
  onDelete,
  item,
  isAdmin = false,
  isDeleting = false,
}: PortfolioPreviewDialogProps) {
  const t = useTranslations("portfolio");
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);

  const onConfirmDelete = async () => {
    await onDelete?.(item);

    setConfirmDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <ConfirmationDialog
        title={t("confirm-delete-title")}
        description={t("confirm-delete-desc")}
        confirmText={t("confirm-delete-confirm")}
        cancelText={t("confirm-delete-cancel")}
        open={confirmDialogOpen}
        isPending={isDeleting}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={onConfirmDelete}
      />
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogTitle className="hidden">{item.name}</DialogTitle>
        <DialogDescription className="hidden">
          {item.name} - {item.uri}
        </DialogDescription>
        <DialogContent className="lg:max-w-5xl flex flex-col gap-4">
          {(item.type === "video" || item.type === "audio") && (
            <AspectRatio ratio={16 / 9}>
              <div className="h-full w-full border rounded border-muted overflow-hidden flex items-center justify-center bg-muted transition">
                <MarkdownPreview
                  className="w-full"
                  markdownString={
                    item.type === "video"
                      ? item.uri
                      : `::audio[${item.name}]{url="${item.uri}"}`
                  }
                />
              </div>
            </AspectRatio>
          )}
          {item.type === "image" && (
            <AspectRatio ratio={16 / 9}>
              <div className="h-full border rounded border-muted overflow-hidden">
                <Web3Image
                  src={web2URL(item.uri)}
                  alt={`${item.name}-bg`}
                  fill
                  sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                  className={cn(
                    "flex object-cover rounded self-center cursor-pointer blur overflow-hidden brightness-[75%]",
                    "transition-all",
                  )}
                />
                <Web3Image
                  src={web2URL(item.uri)}
                  alt={item.name}
                  fill
                  sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                  className={cn(
                    "flex object-contain rounded self-center cursor-pointer",
                    "transition-all",
                  )}
                />
              </div>
            </AspectRatio>
          )}

          {isAdmin && (
            <div className="flex gap-2 items-center">
              <Button
                variant="link"
                onClick={() => setConfirmDialogOpen(true)}
                className="text-main px-0"
              >
                {t("delete")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
