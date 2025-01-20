"use client";

import React from "react";
import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
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
                <span>{t("sign-up")}</span>
              </Button>
            </SignUpButton>
            <SignInButton>
              <Button>
                <span>{t("sign-in")}</span>
              </Button>
            </SignInButton>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SignedOut>
  );
};
