"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "../shadcn/button";
import Text from "../texts/text";

interface BeforeInstallPromptEvent extends Event {
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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
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
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === "accepted") {
        setIsVisible(false);
      }
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <Button
        onClick={() => {
          throw new Error("Fake error");
        }}
      >
        Test
      </Button>
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
