import { ImageLoaderProps } from "next/image";
import { web2URL } from "./uris";

// NOTE: be careful, this will serve unoptimized images for web2 srcs,
// this should only be used in web3 images
export default function withWeb3ImgLoader<T extends ImageLoaderProps>({
  imgFit,
}: {
  imgFit?: "scale-down" | "contain" | "cover" | "crop" | "pad";
}): (props: T) => string {
  return ({ src, width, quality }: T) => {
    if (!src.startsWith("ipfs://")) {
      return src;
    }

    if (quality === undefined) {
      quality = 75;
    }

    let url = `${web2URL(src)}?img-width=${width}&img-format=webp&img-quality=${quality}`;

    if (imgFit !== undefined) {
      url += `&img-fit=${imgFit}`;
    }
    return url;
  };
}
