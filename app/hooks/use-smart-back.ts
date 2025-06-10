import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const useSmartBack = (fallbackRoute = "/discover") => {
  const router = useRouter();
  const pathname = usePathname();
  const prevPath = useRef<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Track previous route using sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("lastVisitedRoute");
    if (stored && stored !== pathname) {
      prevPath.current = stored;
    }

    // Update the last route after every render
    sessionStorage.setItem("lastVisitedRoute", pathname || "/");

    setCanGoBack(
      (window.history.length > 2 || document.referrer !== "") &&
        pathname !== fallbackRoute &&
        pathname !== "/",
    );
  }, [pathname, fallbackRoute]);

  const handleBack = () => {
    if (typeof window === "undefined") return;

    const hasHistory = window.history.length > 2 || document.referrer !== "";

    if (hasHistory) {
      router.back();
    } else if (prevPath.current && prevPath.current !== pathname) {
      router.push(prevPath.current);
    } else {
      router.push(fallbackRoute);
    }
  };

  return { handleBack, canGoBack };
};

export default useSmartBack;
