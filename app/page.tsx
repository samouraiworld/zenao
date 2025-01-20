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
          <p className="text-3xl font-semibold w-[200px] text-center">
            {t("main-text")}
          </p>
          <p className="my-10 w-[280px] text-sm text-secondary-color text-center">
            {t("secondary-text")}
          </p>
          <Input
            placeholder={t("placeholder")}
            className="dark:bg-secondary dark:border-secondary mb-4 h-10 flex pb-1 rounded-lg focus-visible:ring-0"
          />
          <Button asChild className="w-full flex rounded-3xl py-5">
            <Link href="/create" className="text-sm">
              {t("button")}
            </Link>
          </Button>
        </main>
      </div>
      <Footer />
    </div>
  );
}
