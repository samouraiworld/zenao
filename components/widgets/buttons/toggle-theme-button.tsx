"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";

export const ToggleThemeButton: React.FC = () => {
  const { setTheme } = useTheme();
  const { trackEvent } = useAnalyticsEvents();
  const t = useTranslations("components.toggle-theme-button");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        aria-label={t("dropdown-trigger-aria-label")}
      >
        <Button variant="outline" size="icon" className="focus-visible:ring-0">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t("toggle-theme-label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            setTheme("light");
            trackEvent("ThemeChange", { props: { theme: "light" } });
          }}
          aria-label={t("light-aria-label")}
        >
          {t("light-option")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          aria-label={t("dark-aria-label")}
        >
          {t("dark-option")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          aria-label={t("system-aria-label")}
        >
          {t("system-option")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
