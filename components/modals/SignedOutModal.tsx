"use client";

import React from "react";
import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { SmallText } from "../texts/SmallText";
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
                <SmallText>{t("sign-up")}</SmallText>
              </Button>
            </SignUpButton>
            <SignInButton>
              <Button>
                <SmallText variant="invert">{t("sign-in")}</SmallText>
              </Button>
            </SignInButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SignedOut>
  );
};
