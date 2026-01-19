"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/shadcn/button";

export default function UpgradePlan({ currentPlan }: { currentPlan: string }) {
  const t = useTranslations("dashboard.upgradePlan");

  return (
    <div className="p-6 border rounded-md border-yellow-400 bg-yellow-50 text-yellow-800">
      <h2 className="text-lg font-medium mb-2">{t("title")}</h2>
      <p className="mb-4"> {t("subtitle", { currentPlan })}</p>
      <Link
        href="https://discord.gg/TkpJgp9zjK"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700">
          {t("contact-us")}
        </Button>
      </Link>
    </div>
  );
}
