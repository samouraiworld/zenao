import NextTopLoader from "nextjs-toploader";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Albert_Sans } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import QueryProviders from "./query-providers";
import { Header } from "@/components/navigation/header";
import { Footer } from "@/components/navigation/footer";
import { Toaster } from "@/components/shadcn/toaster";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Zenao",
  description: "Zenao.io - Events & Tribes Organizations",
  openGraph: {
    images: "/zenao-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html suppressHydrationWarning lang={locale}>
      <body className={`${albertSans.variable} antialiased`}>
        <ClerkProvider>
          <QueryProviders>
            <NuqsAdapter>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <NextIntlClientProvider messages={messages}>
                  <NextTopLoader showSpinner={false} color="#EC7E17" />
                  <div className="h-screen flex flex-col family-name:var(--font-geist-sans)]">
                    <Header />
                    {children}
                    {/* <Footer /> */}
                  </div>
                </NextIntlClientProvider>
              </ThemeProvider>
            </NuqsAdapter>
          </QueryProviders>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
