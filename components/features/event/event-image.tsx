import { ImageProps } from "next/image";
import { AspectRatio } from "@/components/shadcn/aspect-ratio";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { cn } from "@/lib/tailwind";
import { Skeleton } from "@/components/shadcn/skeleton";

export const eventImageAspectRatio = [16, 9] as const;

export function EventImage(props: ImageProps) {
  const { className, ...imageProps } = props;
  return (
    <AspectRatio
      ratio={eventImageAspectRatio[0] / eventImageAspectRatio[1]}
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

export function EventImageSkeleton(props: Pick<ImageProps, "className">) {
  const { className } = props;
  return (
    <AspectRatio
      ratio={eventImageAspectRatio[0] / eventImageAspectRatio[1]}
      className={className}
    >
      <Skeleton style={{ width: "100%", height: "100%" }} />
    </AspectRatio>
  );
}
