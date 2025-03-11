import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/cards/Card";
import { Text } from "@/components/texts/DefaultText";
import { LargeText } from "@/components/texts/LargeText";

interface BlogPostCardProps {
  title: string;
  description: string;
  date: Date;
  slug: string;
}

export default function BlogPostCard({
  title,
  description,
  slug,
}: BlogPostCardProps) {
  return (
    <Link href={`/blog/${slug}`} className="w-full max-w-md h-full">
      <Card className="flex flex-col h-full gap-8 hover:bg-secondary/60 transition-colors">
        <div className="flex aspect-[16/7] justify-center items-center bg-background rounded-lg">
          <Image
            src="/zenao-logo.png"
            alt="Zenao logo"
            width={300}
            height={300}
            className="w-16 h-16"
          />
        </div>
        <div className="flex flex-col h-full gap-4">
          <LargeText>{title}</LargeText>
          <Text>{description}</Text>
        </div>
        <Text>View more...</Text>
      </Card>
    </Link>
  );
}
