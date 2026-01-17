import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

const SUPPORTED_LOCALES = ["en", "fr"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";

function getPreferredLocale(acceptLanguage: string): Locale {
  // Parse Accept-Language header and find the first supported locale
  const languages = acceptLanguage.split(",").map((lang) => {
    const [code] = lang.trim().split(";");
    return code.split("-")[0].toLowerCase();
  });

  for (const lang of languages) {
    if (SUPPORTED_LOCALES.includes(lang as Locale)) {
      return lang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

export default getRequestConfig(async () => {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language") || "";
  const locale = getPreferredLocale(acceptLanguage);

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
