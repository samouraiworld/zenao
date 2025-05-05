import { useTranslations } from "next-intl";
import { CheckCircle2, XCircle } from "lucide-react";
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
  DrawerDescription,
  DrawerFooter,
  DrawerTitle,
} from "../shadcn/drawer";
import { ButtonWithChildren } from "../buttons/ButtonWithChildren";
import { Button } from "../shadcn/button";
import { useMediaQuery } from "@/app/hooks/use-media-query";

type CheckinConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CheckinConfirmationDialog({
  open,
  onOpenChange,
}: CheckinConfirmationDialogProps) {
  const t = useTranslations("check-in-confirmation-dialog");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="lg:max-w-2xl bg-green-400">
          <DialogHeader>
            <DialogClose />
          </DialogHeader>

          <div className="flex flex-col py-8 gap-2 items-center">
            <div className="flex justify-center items-center p-6">
              <CheckCircle2 size={128} />
            </div>
            <DialogTitle>Ticket verified</DialogTitle>
            <DialogDescription className="text-white">
              You can enter the venue
            </DialogDescription>
          </div>

          <DialogFooter>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Success
  // return (
  //   <Drawer open={open} onOpenChange={onOpenChange}>
  //     <DrawerContent className="bg-green-400">
  //       <div className="flex flex-col py-8 gap-2 items-center">
  //         <div className="flex justify-center items-center p-6">
  //           <CheckCircle2 size={128} />
  //         </div>
  //         <DialogTitle>Ticket verified</DialogTitle>
  //         <DialogDescription className="text-white">
  //           You can enter the venue
  //         </DialogDescription>
  //       </div>
  //       <DrawerFooter className="pt-2">
  //         <DrawerClose asChild>
  //           <ButtonWithChildren variant="outline">Close</ButtonWithChildren>
  //         </DrawerClose>
  //       </DrawerFooter>
  //     </DrawerContent>
  //   </Drawer>
  // );

  // Failure
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-red-500">
        <div className="flex flex-col py-8 gap-2 items-center">
          <div className="flex justify-center items-center p-6">
            <XCircle size={128} />
          </div>
          <DrawerTitle>Invalid Ticket</DrawerTitle>
          <DrawerDescription className="text-white">
            Error while trying to check in
          </DrawerDescription>
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <ButtonWithChildren variant="outline">Close</ButtonWithChildren>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
