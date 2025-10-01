import { ImageProps } from "next/image";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { cn } from "@/lib/tailwind";

export function EventImage(props: ImageProps) {
  const { className, ...imageProps } = props;
  return (
    <AspectRatio
      ratio={16 / 9}
      className={cn("overflow-hidden rounded", className)}
    >
      <Web3Image
        {...imageProps}
        className="flex w-full rounded self-center object-cover blur"
      />
      <Web3Image
        {...imageProps}
        className="flex w-full rounded self-center object-contain"
      />
    </AspectRatio>
  );
}
