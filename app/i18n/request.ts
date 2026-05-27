import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { type Locale, locales, defaultLocale } from "./config";

function parseAcceptLanguage(header: string): Locale | undefined {
  // Parse Accept-Language header, e.g. "fr-FR,fr;q=0.9,en;q=0.8"
  const langs = header
    .split(",")
    .map((part) => {
      const [lang, q] = part.trim().split(";q=");
      return {
        lang: lang.split("-")[0].toLowerCase(),
        q: q ? parseFloat(q) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  for (const { lang } of langs) {
    if (locales.includes(lang as Locale)) {
      return lang as Locale;
    }
  }
  return undefined;
}

export default getRequestConfig(async () => {
  let locale: Locale = defaultLocale;

  // 1. Check NEXT_LOCALE cookie (user's explicit choice)
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("NEXT_LOCALE")?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    locale = cookieLocale as Locale;
  } else {
    // 2. Fallback to Accept-Language header (browser auto-detect)
    const headerStore = await headers();
    const acceptLang = headerStore.get("accept-language");
    if (acceptLang) {
      locale = parseAcceptLanguage(acceptLang) ?? defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
