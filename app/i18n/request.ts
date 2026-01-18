import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "./config";

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
