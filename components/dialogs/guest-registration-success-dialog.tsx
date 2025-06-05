import { useTranslations } from "next-intl";
import { SignInButton } from "@clerk/nextjs";
import { MailCheck } from "lucide-react";
import { Button } from "../shadcn/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import Text from "../texts/text";
import { useMediaQuery } from "@/app/hooks/use-media-query";

type DialogProps = {
  title: string;
  email: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function GuestRegistrationSuccessDialog({
  title,
  email,
  open,
  onOpenChange,
}: DialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const isStandalone = useMediaQuery("(display-mode: standalone)");
  const t = useTranslations("guest-registration-success-dialog");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col gap-8">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {t("registration-title")}
            </DialogTitle>
            <DialogDescription className="text-base">
              {t("thank-you", { title })}
            </DialogDescription>
          </DialogHeader>

          <MailCheck size={64} className="self-center" />

          <div className="flex flex-col gap-2">
            <Text>{t("tickets-explanation")} </Text>
            <Text className="font-semibold">{email}</Text>
            <Text>{t("profile-completion-invitation")}</Text>
          </div>
          <SignInButton>
            <Button variant="outline">
              <Text>{t("sign-in")}</Text>
            </Button>
          </SignInButton>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} modal={!isStandalone}>
      <DrawerContent className="flex flex-col gap-8 pb-8 px-4">
        <DrawerHeader>
          <DrawerTitle className="text-2xl">
            {t("registration-title")}
          </DrawerTitle>
          <DrawerDescription className="text-base">
            {t("thank-you", { title })}
          </DrawerDescription>
        </DrawerHeader>

        <MailCheck size={64} className="self-center" />

        <div className="flex flex-col gap-2">
          <Text>{t("tickets-explanation")} </Text>
          <Text className="font-semibold">{email}</Text>
          <Text>{t("profile-completion-invitation")}</Text>
        </div>
        <SignInButton>
          <Button variant="outline">
            <Text>{t("sign-in")}</Text>
          </Button>
        </SignInButton>
      </DrawerContent>
    </Drawer>
  );
}
