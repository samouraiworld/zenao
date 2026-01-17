"use client";

import { Check, Globe } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Button } from "@/components/shadcn/button";
import { LOCALE_COOKIE_NAME } from "@/app/i18n/config";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

function useLocaleChange() {
  const locale = useLocale();

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `${LOCALE_COOKIE_NAME}=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  return { locale, handleLocaleChange };
}

/**
 * Standalone language switcher button with dropdown
 */
export function LanguageSwitcherButon() {
  const { locale, handleLocaleChange } = useLocaleChange();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Globe className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLocaleChange(lang.code)}
            className="cursor-pointer"
          >
            {lang.label}
            {locale === lang.code && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Language switcher as a submenu item (for use inside another dropdown)
 */
export function LanguageSwitcherSubmenu() {
  const t = useTranslations("dashboard.navUser");
  const { locale, handleLocaleChange } = useLocaleChange();

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <Globe />
        {t("language")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => handleLocaleChange(lang.code)}
            className="cursor-pointer"
          >
            {lang.label}
            {locale === lang.code && <Check className="ml-auto size-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
