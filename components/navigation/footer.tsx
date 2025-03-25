import { FacebookIcon, LinkedinIcon, TwitterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React from "react";
import Text from "../texts/text";

export const Footer = () => {
  const t = useTranslations("navigation");

  return (
    <footer className="flex flex-row justify-between items-end p-4">
      <div className="flex flex-row gap-3 sm:gap-5">
        <Text
          size="sm"
          variant="secondary"
          className="underline underline-offset-1"
        >
          {t("footer.terms")}
        </Text>
        <Text
          size="sm"
          variant="secondary"
          className="underline underline-offset-1"
        >
          {t("footer.privacy")}
        </Text>
        <Text
          size="sm"
          variant="secondary"
          className="underline underline-offset-1"
        >
          {t("footer.security")}
        </Text>
      </div>
      <div className="flex flex-row gap-3 sm:gap-5">
        <TwitterIcon className="h-5 w-5" />
        <FacebookIcon className="h-5 w-5" />
        <LinkedinIcon className="h-5 w-5" />
      </div>
    </footer>
  );
};
