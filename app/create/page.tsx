"use client";

import { redirect } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { zenaoClient } from "../zenao-client";
import { BusinessAccounts } from "./business-accounts";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CreateEventForm } from "@/components/form/CreateEventForm";
import { SignedOutModal } from "@/components/modals/SignedOutModal";
import { Button } from "@/components/shadcn/button";

export default function CreateEventPage() {
  const { client } = useClerk();
  return (
    <div className="h-screen flex flex-col font-[family-name:var(--font-geist-sans)]">
      <Header />

      <Button
        onClick={async () => {
          const token = await client.activeSessions[0].getToken();
          if (!token) {
            throw new Error("invalid clerk token");
          }
          const orgAccount = await zenaoClient.createBusinessAccount(
            {},
            { headers: { Authorization: "Bearer " + token } },
          );
          redirect(orgAccount.accountLink);
        }}
      >
        Create Business Account
      </Button>
      <Button
        onClick={async () => {
          const token = await client.activeSessions[0].getToken();
          if (!token) {
            throw new Error("invalid clerk token");
          }
          const accs = await zenaoClient.listBusinessAccounts(
            {},
            { headers: { Authorization: "Bearer " + token } },
          );
          console.log(accs);
        }}
      >
        List accounts
      </Button>
      <BusinessAccounts />

      <div className="h-screen flex flex-col justify-center items-center">
        <main className="flex flex-col mb-10 justify-center items-center">
          <CreateEventForm />
          <div className="flex gap-4 mt-8 items-center flex-col sm:flex-row"></div>
        </main>
      </div>
      <SignedOutModal />
      <Footer />
    </div>
  );
}
