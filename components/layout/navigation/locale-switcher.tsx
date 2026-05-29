"use client";

import { useLocale, useTranslations } from "next-intl";
import { Globe } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import {
  type Locale,
  locales,
  localeNames,
  localeFlags,
} from "@/app/i18n/config";
import { useLocaleChange } from "@/hooks/use-locale-change";

export function LocaleSwitcher() {
  const currentLocale = useLocale() as Locale;
  const t = useTranslations("a11y");
  const { isPending, handleLocaleChange } = useLocaleChange();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-auto w-auto p-0 text-secondary-color hover:text-primary-color hover:bg-transparent [&_svg]:size-5"
          disabled={isPending}
          aria-label={t("switch-language")}
        >
          <Globe />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map((locale) => (
          <DropdownMenuItem
            key={locale}
            onClick={() => handleLocaleChange(locale)}
            className={locale === currentLocale ? "bg-accent font-medium" : ""}
          >
            <span className="mr-2">{localeFlags[locale]}</span>
            {localeNames[locale]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
