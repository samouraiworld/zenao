import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

const SUPPORTED_LOCALES = ["en", "fr"] as const;
type Locale = (typeof SUPPORTED_LOCALES)[number];
const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_NAME = "locale";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get(LOCALE_COOKIE_NAME)?.value;

  const locale =
    localeCookie && SUPPORTED_LOCALES.includes(localeCookie as Locale)
      ? (localeCookie as Locale)
      : DEFAULT_LOCALE;

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
