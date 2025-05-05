import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from "../shadcn/drawer";
import { ButtonWithChildren } from "../buttons/ButtonWithChildren";
import { Button } from "../shadcn/button";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { cn } from "@/lib/tailwind";

type CheckinConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  error?: boolean;
};

function CheckinConfirmationDialogContent({
  loading,
  error,
}: Pick<CheckinConfirmationDialogProps, "error" | "loading">) {
  const t = useTranslations("check-in-confirmation-dialog");

  return (
    <div className="flex flex-col py-8 gap-2 items-center text-white">
      {loading ? (
        <div className="flex justify-center items-center p-6">
          <Loader2 className="animate-spin" />
        </div>
      ) : (
        <>
          <div className="flex justify-center items-center p-6">
            {error ? <XCircle size={128} /> : <CheckCircle2 size={128} />}
          </div>
          <DialogTitle>{t(`title-${error ? "error" : "success"}`)}</DialogTitle>
          <DialogDescription className="text-white">
            {t(`description-${error ? "error" : "success"}`)}
          </DialogDescription>
        </>
      )}
    </div>
  );
}

export function CheckinConfirmationDialog({
  open,
  loading,
  error,
  onOpenChange,
}: CheckinConfirmationDialogProps) {
  const t = useTranslations("check-in-confirmation-dialog");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "lg:max-w-2xl",
            error ? "bg-red-500" : "bg-green-400",
            loading && "bg-main",
          )}
        >
          <DialogHeader>
            <DialogClose />
          </DialogHeader>
          <CheckinConfirmationDialogContent loading={loading} error={error} />
          <DialogFooter>
            {!loading && (
              <DialogClose asChild>
                <Button variant="outline" className="w-full">
                  {t("close")}
                </Button>
              </DialogClose>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className={error ? "bg-red-500" : "bg-green-400"}>
        <CheckinConfirmationDialogContent error={error} />
        <DrawerFooter className="pt-2">
          {!loading || (
            <DrawerClose asChild>
              <ButtonWithChildren variant="outline">
                {t("close")}
              </ButtonWithChildren>
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
