import NextTopLoader from "nextjs-toploader";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import QueryProviders from "./query-providers";
import { Header } from "./header";
import { Footer } from "./footer";
import { Toaster } from "@/components/shadcn/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <QueryProviders>
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
                  <Footer />
                </div>
              </NextIntlClientProvider>
            </ThemeProvider>
          </QueryProviders>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
