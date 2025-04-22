"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "../shadcn/button";
import { debounce } from "@/lib/debounce";

const HEIGHT_THRESHOLD = 0.3;

export function GoTopButton() {
  const [showedOnce, setShowedOnce] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = debounce(() => {
      if (containerRef.current) {
        const scrollRatio = window.scrollY / document.body.scrollHeight;
        setShowedOnce(true);

        if (scrollRatio >= HEIGHT_THRESHOLD) {
          containerRef.current.classList.remove(
            "animate-gotop-disappear",
            "translate-y-0",
          );
          // Force reflow
          void containerRef.current.offsetWidth;
          containerRef.current.classList.add(
            "translate-y-32",
            "animate-gotop-appear",
          );
        } else if (showedOnce) {
          containerRef.current.classList.remove(
            "animate-gotop-appear",
            "translate-y-32",
          );
          // Force reflow
          void containerRef.current.offsetWidth;
          containerRef.current.classList.add(
            "translate-y-0",
            "animate-gotop-disappear",
          );
        }
      }
    }, 100);

    window.removeEventListener("scroll", onScroll);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [containerRef, showedOnce]);

  return (
    <div
      ref={containerRef}
      className="fixed z-50 right-4 bottom-16 translate-y-32 transition-all"
    >
      <Button
        onClick={() =>
          window.scrollTo({
            top: document.getElementById("top")?.clientHeight,
            behavior: "smooth",
          })
        }
      >
        Go to top
      </Button>
    </div>
  );
}
