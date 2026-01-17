import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "./config";

export default getRequestConfig(async () => {
  const headersList = await headers();
  const localeHeader = headersList.get("x-locale");

  const locale =
    localeHeader && SUPPORTED_LOCALES.includes(localeHeader as Locale)
      ? (localeHeader as Locale)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
