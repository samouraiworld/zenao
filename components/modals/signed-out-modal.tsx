import React from "react";
import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import Text from "../widgets/texts/text";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { Button } from "@/components/shadcn/button";

export const SignedOutModal: React.FC = () => {
  const t = useTranslations("components.modals.signed-out-modal");

  return (
    <SignedOut>
      <AlertDialog open={true}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("description")} </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <SignUpButton>
              <Button variant="secondary">
                <Text size="sm">{t("sign-up")}</Text>
              </Button>
            </SignUpButton>
            <SignInButton>
              <Button>
                <Text variant="invert" size="sm">
                  {t("sign-in")}
                </Text>
              </Button>
            </SignInButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SignedOut>
  );
};
