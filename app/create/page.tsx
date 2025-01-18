"use client";

import { SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CreateEventForm } from "@/components/form/CreateEventForm";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/shadcn/alert-dialog";
import { Button } from "@/components/shadcn/button";

export default function CreateEventPage() {
  return (
    <div className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />
      <div className="h-screen flex flex-col justify-center items-center">
        <main className="flex flex-col mb-10 justify-center items-center">
          <CreateEventForm />
          <div className="flex gap-4 mt-8 items-center flex-col sm:flex-row"></div>
        </main>
      </div>
      <SignedOut>
        <AlertDialog open={true}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign In/Sign Up</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <SignUpButton>
                <Button variant="secondary">
                  <span>Sign Up</span>
                </Button>
              </SignUpButton>
              <SignInButton>
                <Button>
                  <span>Sign In</span>
                </Button>
              </SignInButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SignedOut>
      <Footer />
    </div>
  );
}
