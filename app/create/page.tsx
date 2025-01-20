"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CreateEventForm } from "@/components/form/CreateEventForm";
import { SignedOutModal } from "@/components/modals/SignedOutModal";

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
      <SignedOutModal />
      <Footer />
    </div>
  );
}
