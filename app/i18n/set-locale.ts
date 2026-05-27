"use server";

import { cookies } from "next/headers";
import { type Locale, locales, defaultLocale } from "./config";

export async function setLocale(locale: Locale) {
  if (!locales.includes(locale)) {
    locale = defaultLocale;
  }

  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
