import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/cards/Card";
import { Text } from "@/components/texts/DefaultText";
import { LargeText } from "@/components/texts/LargeText";

interface BlogPostCardProps {
  title: string;
  description: string;
  url: string;
}

export default function BlogPostCard({
  title,
  description,
  url,
}: BlogPostCardProps) {
  return (
    // Column layout
    <Link
      href={url}
      className="w-full max-w-md hover:scale-105 transition-transform"
    >
      <Card className="flex flex-col gap-8">
        <div className="flex aspect-[16/7] justify-center items-center bg-background rounded-lg">
          <Image
            src="/zenao-logo.png"
            alt="Zenao logo"
            width={300}
            height={300}
            className="w-16 h-16"
          />
        </div>
        <LargeText>{title}</LargeText>
        <Text>{description}</Text>

        <Text>View more...</Text>
      </Card>
    </Link>

    // Row layout
    // <Link href={url} className="w-full hover:scale-105 transition-transform">
    //   <Card className="flex gap-8">
    //     <div className="flex aspect-square w-36 justify-center items-center bg-background rounded-lg">
    //       <Image
    //         src="/zenao-logo.png"
    //         alt="Zenao logo"
    //         width={300}
    //         height={300}
    //         className="w-16 h-16"
    //       />
    //     </div>
    //     <div className="flex flex-col justify-between">
    //       <div className="flex flex-col gap-2">
    //         <LargeText>{title}</LargeText>
    //         <Text>{description}</Text>
    //       </div>

    //       <Text>View more...</Text>
    //     </div>
    //   </Card>
    // </Link>
  );
}
