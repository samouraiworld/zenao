import { FacebookIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import { SmallText } from "@/components/texts/SmallText";

export const Footer: React.FC = () => {
  const t = useTranslations("footer");
  return (
    <footer className={`flex flex-row justify-between items-end p-4 h-[52px]`}>
      <div className="flex flex-row gap-3 sm:gap-5">
        <SmallText variant="secondary" className="underline underline-offset-1">
          {t("terms")}
        </SmallText>
        <SmallText variant="secondary" className="underline underline-offset-1">
          {t("privacy")}
        </SmallText>
        <SmallText variant="secondary" className="underline underline-offset-1">
          {t("security")}
        </SmallText>
      </div>
      <div className="flex flex-row gap-3 sm:gap-5">
        <TwitterIcon className="h-5 w-5" />
        <FacebookIcon className="h-5 w-5" />
        <LinkedinIcon className="h-5 w-5" />
      </div>
    </footer>
  );
};
