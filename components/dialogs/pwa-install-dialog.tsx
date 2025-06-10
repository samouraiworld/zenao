import { DialogDescription } from "@radix-ui/react-dialog";
import { BeforeInstallPromptEvent } from "../buttons/pwa-install-button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import Heading from "../texts/heading";
import { ButtonWithChildren } from "../buttons/ButtonWithChildren";
import { useMediaQuery } from "@/app/hooks/use-media-query";
import { cn } from "@/lib/tailwind";

type PwaInstallDialogProps = {
  open: boolean;
  platform: "android" | "ios" | "unknown";
  deferredPrompt?: BeforeInstallPromptEvent | null;
  onOpenChange: (open: boolean) => void;
};

function PwaInstallDialogContent({
  platform,
}: Pick<PwaInstallDialogProps, "platform">) {
  return (
    <div className="flex flex-col gap-4">
      {(platform === "android" || platform === "unknown") && (
        <div className="flex flex-col gap-2">
          <Heading level={3}>📱 Android (Chrome)</Heading>
          <ol className="list-decimal pl-5">
            <li>
              Tap the <strong>⋮ menu</strong> at top-right.
            </li>
            <li>
              Tap <strong>Add to Home screen</strong>.
            </li>
            <li>
              Tap <strong>Install</strong>.
            </li>
          </ol>
        </div>
      )}

      {(platform === "ios" || platform === "unknown") && (
        <div className="flex flex-col gap-2">
          <Heading level={3}>🍎 iPhone (Safari)</Heading>
          <ol className="list-decimal pl-5">
            <li>
              Tap the <strong>Share icon</strong> (📤).
            </li>
            <li>
              Tap <strong>Add to Home Screen</strong>.
            </li>
            <li>
              Tap <strong>Add</strong>.
            </li>
          </ol>
        </div>
      )}

      {platform === "unknown" && (
        <div className="flex flex-col gap-2">
          <Heading level={3}>💻 Desktop (Chrome/Edge)</Heading>
          <ol className="list-decimal pl-5">
            <li>
              Click the <strong>install icon</strong> in the address bar.
            </li>
            <li>
              Click <strong>Install</strong>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

export function PwaInstallDialog({
  open,
  platform,
  onOpenChange,
}: PwaInstallDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("lg:max-w-2xl")}>
          <DialogClose />
          <DialogHeader>
            <DialogTitle>Install this app on your device !</DialogTitle>
            <DialogDescription className="text-secondary-color">
              Add this app to your Home Screen for easy access — just like a
              native app! Follow the steps below:
            </DialogDescription>
          </DialogHeader>
          <PwaInstallDialogContent platform={platform} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerClose />
          <DrawerTitle>Install this app on your device !</DrawerTitle>
          <DialogDescription className="text-secondary-color">
            Add this app to your Home Screen for easy access — just like a
            native app! Follow the steps below:
          </DialogDescription>
        </DrawerHeader>
        <div className="px-4">
          <PwaInstallDialogContent platform={platform} />
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
