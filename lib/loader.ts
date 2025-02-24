"use client";

import { web2URL } from "./uris";

export default function web3Loader({
  src,
  width,
}: {
  src: string;
  width: number;
}) {
  if (src.startsWith("ipfs://")) {
    return `${web2URL(src)}?img-width=${width}&img-dpr=2`;
  }
  return src;
}
