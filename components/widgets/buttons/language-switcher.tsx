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

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
] as const;

function useLocaleChange() {
  const locale = useLocale();

  const handleLocaleChange = (_newLocale: string) => {
    // TODO: Implement locale change logic
    // This should update the locale preference (cookie, localStorage, or user settings)
    // and trigger a page refresh or navigation to apply the new locale
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
