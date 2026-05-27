import React from "react";
import { web2URL } from "@/lib/uris";

export const Web3Audio = React.forwardRef<HTMLAudioElement, { src: string }>(
  ({ src, ...props }, ref) => {
    const isWeb3 = typeof src === "string" && src.startsWith("ipfs://");

    return <audio ref={ref} src={!isWeb3 ? src : web2URL(src)} {...props} />;
  },
);

Web3Audio.displayName = "Web3Audio";
