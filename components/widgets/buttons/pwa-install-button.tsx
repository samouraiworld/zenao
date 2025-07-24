"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { Button } from "../../shadcn/button";
import Text from "../texts/text";
import { PwaInstallDialog } from "../../dialogs/pwa-install-dialog";
import useIsPWAInstalled from "@/hooks/use-is-pwa-installed";

export const LazyInstallButton = dynamic(
  () => import("@/components/widgets/buttons/pwa-install-button"),
  { ssr: false },
);

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const { platform, installed } = useIsPWAInstalled(navigator.userAgent);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // `beforeinstallprompt`: This feature is non-standard
    // Every browser is not compatible, that's why we don't display the button
    // in every case
    // https://developer.mozilla.org/en-US/docs/Web/API/BeforeInstallPromptEvent/BeforeInstallPromptEvent
    window.addEventListener("beforeinstallprompt", handler as EventListener);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handler as EventListener,
      );
  }, []);

  const installApp = async () => {
    setInstallDialogOpen(true);
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  if (installed) {
    return null;
  }

  return (
    <>
      <PwaInstallDialog
        open={installDialogOpen}
        platform={platform}
        deferredPrompt={deferredPrompt}
        onOpenChange={setInstallDialogOpen}
      />
      <Button
        variant="outline"
        className="standalone:hidden w-fit flex rounded-3xl py-5"
        onClick={installApp}
      >
        <Text className="text-sm">Install app</Text>
        <Download size={14} />
      </Button>
    </>
  );
}
