"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/shadcn/input";
import { Button } from "@/components/shadcn/button";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="h-screen w-screen flex flex-col border-solid family-name:var(--font-geist-sans)]">
      <Header />
      <div className="h-screen flex flex-col justify-center items-center mb-10 sm:mb-0">
        <main className="flex mw-1/4 flex-col justify-center items-center">
          <Image
            src="/zenao-logo.png"
            alt="zeano logo"
            width={200}
            height={200}
            priority
            className="mb-5 mt-5"
          />
          <p className="text-3xl font-semibold">Organize</p>
          <p className="text-3xl font-semibold">event(s)</p>
          <p className="text-3xl font-semibold">in seconds</p>
          <p className="mt-10 text-sm dark:text-[#808080]">{`"Anything that happens, arrives or appears,`}</p>
          <p className="text-sm dark:text-[#808080]">
            can give birth to an autonomous community,
          </p>
          <p className="mb-10 text-sm dark:text-[#808080]">
            {" "}
            {`or a new tribe."`}
          </p>
          <Input
            placeholder="Event name..."
            className="dark:bg-[#1B1B1B] dark:border-[#1B1B1B] mb-4 h-10 flex pb-1 rounded-lg focus-visible:ring-0"
          />
          <Button asChild className="w-full flex rounded-3xl py-5">
            <Link href="/create" className="text-sm">
              Create your event
            </Link>
          </Button>
        </main>
      </div>
      <Footer />
    </div>
  );
}
