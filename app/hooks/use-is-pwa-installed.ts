"use client";

import { useEffect, useState } from "react";

const useIsPWAInstalled = (ua: string) => {
  // Don't display at first load
  const [installed, setInstalled] = useState(true);
  const [platform, setPlatform] = useState<"android" | "ios" | "unknown">(
    "unknown",
  );
  useEffect(() => {
    const IOS = ua.match(/iPhone|iPad|iPod/);
    const ANDROID = ua.match(/Android/);

    const PLATFORM = IOS ? "ios" : ANDROID ? "android" : "unknown";

    // Log the platform and installed status for debugging
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setInstalled(!!standalone);
    setPlatform(PLATFORM);
  }, [ua]);

  return { platform, installed };
};

export default useIsPWAInstalled;
