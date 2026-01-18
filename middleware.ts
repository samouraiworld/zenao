import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  type Locale,
} from "@/app/i18n/config";

function getLocaleFromRequest(request: NextRequest): string {
  const localeCookie = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  return localeCookie && SUPPORTED_LOCALES.includes(localeCookie as Locale)
    ? localeCookie
    : DEFAULT_LOCALE;
}

export default clerkMiddleware((_auth, request) => {
  const locale = getLocaleFromRequest(request);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-locale", locale);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Sentry tunnel
    "/((?!monitoring-tunnel))",
  ],
};
