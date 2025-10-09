import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "../shadcn/dialog";
import { Web3Image } from "../widgets/images/web3-image";
import { Button } from "../shadcn/button";
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
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);

  const onConfirmDelete = async () => {
    await onDelete?.(item);

    setConfirmDialogOpen(false);
    onOpenChange(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <ConfirmationDialog
        title="Are your sure you want to delete this image?"
        description="This action cannot be undone."
        confirmText="Yes, delete it"
        cancelText="Cancel"
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

          {isAdmin && (
            <div className="flex gap-2 items-center">
              <Button
                variant="link"
                onClick={() => setConfirmDialogOpen(true)}
                className="text-main px-0"
              >
                Delete image
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
