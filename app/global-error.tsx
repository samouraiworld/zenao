"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import PlausibleProvider from "next-plausible";
import { ThemeProvider } from "next-themes";
import NextTopLoader from "nextjs-toploader";
import { Albert_Sans } from "next/font/google";
import { NextIntlClientProvider, useTranslations } from "next-intl";
import enMessages from "@/app/i18n/messages/en.json";
import PwaStateProvider from "@/components/providers/pwa-state-provider";
import { TooltipProvider } from "@/components/shadcn/tooltip";
import { Footer } from "@/components/layout/navigation/footer";
import PwaBottomBar from "@/components/layout/navigation/pwa-bottom-bar";
import { ScreenContainerCentered } from "@/components/layout/screen-container";
import { Button } from "@/components/shadcn/button";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const contextNow = new Date();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENV ?? "development" !== "development") {
      Sentry.captureException(error);
    }
  }, [error]);

  return (
    <html suppressHydrationWarning lang="en">
      <body
        suppressHydrationWarning
        className={`${albertSans.variable} antialiased`}
      >
        <ClerkProvider>
          <NuqsAdapter>
            <PlausibleProvider domain="zenao.io">
              <PwaStateProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                  disableTransitionOnChange
                >
                  <TooltipProvider>
                    <NextIntlClientProvider
                      locale="en"
                      messages={enMessages}
                      now={contextNow}
                    >
                      <NextTopLoader showSpinner={false} color="#EC7E17" />
                      <div className="standalone:bottom-bar-padding h-screen flex flex-col family-name:var(--font-geist-sans)]">
                        <ScreenContainerCentered>
                          <MainErrorContent />
                        </ScreenContainerCentered>
                        <Footer />
                        <PwaBottomBar />
                      </div>
                    </NextIntlClientProvider>
                  </TooltipProvider>
                </ThemeProvider>
              </PwaStateProvider>
            </PlausibleProvider>
          </NuqsAdapter>
        </ClerkProvider>
      </body>
    </html>
  );
}

function MainErrorContent() {
  const t = useTranslations("error");

  return (
    <div className="flex-grow h-full flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">
          {t("oops-something-went-wrong")}
        </h1>
        <p className="mb-6">{t("unexpected-error-occurred")}</p>
        <Button onClick={() => window.location.reload()}>
          {t("refresh-page")}
        </Button>
      </div>
    </div>
  );
}
