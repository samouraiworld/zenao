import { ImageLoaderProps } from "next/image";
import { web2URL } from "./uris";

// NOTE: be careful, this will serve unoptimized images for web2 srcs,
// this should only be used in web3 images
export function web3ImgLoader({ src, width, quality }: ImageLoaderProps) {
  if (src.startsWith("ipfs://")) {
    return `${web2URL(src)}?img-width=${width}&img-quality=${quality}&img-format=webp`;
  }
  return src;
}
