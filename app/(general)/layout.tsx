import NextTopLoader from "nextjs-toploader";
import { Footer } from "@/components/layout/navigation/footer";
import { Header } from "@/components/layout/navigation/header";
import PwaBottomBar from "@/components/layout/navigation/pwa-bottom-bar";

export default function GeneralLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NextTopLoader showSpinner={false} color="#EC7E17" />
      <div className="standalone:bottom-bar-padding h-screen flex flex-col family-name:var(--font-geist-sans)]">
        <Header />
        {children}
        <Footer />
        <PwaBottomBar />
      </div>
    </>
  );
}
