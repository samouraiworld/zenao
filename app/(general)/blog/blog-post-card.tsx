"use client";

import Link from "next/link";
import { IArticleIndex } from "seobot/dist/types/blog";
import PostDate from "./[slug]/post-date";
import { Card } from "@/components/widgets/cards/card";
import Text from "@/components/widgets/texts/text";
import Heading from "@/components/widgets/texts/heading";
import { EventImage } from "@/components/features/event/event-image";

declare module "seobot/dist/types/blog" {
  interface IArticleIndex {
    id: string;
    slug: string;
    headline: string;
    metaDescription: string;
    image: string;
    readingTime: number;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string;
    category: {
      title: string;
      slug: string;
    } | null;
    tags: {
      title: string;
      slug: string;
    }[];
    isTool?: boolean;
    isVideo?: boolean;
    isNews?: boolean;
  }
}

export default function BlogPostCard({ post }: { post: IArticleIndex }) {
  const { alt, ...imageProps } = post.image
    ? {
        src: post.image,
        alt: `${post.headline} post image background`,
      }
    : {
        src: "/zenao-logo.png",
        alt: "Zenao logo",
      };
  return (
    <Card
      role="group"
      className="cursor-pointer w-full flex flex-col h-full gap-8 hover:bg-secondary/50 transition-colors"
    >
      <div className="flex flex-col gap-2">
        <EventImage
          {...imageProps}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw,
                (max-width: 1200px) 50vw,
                33vw"
          quality={60}
        />
      </div>
      <div className="flex flex-col h-full gap-4">
        <Link href={`/blog/${post.slug}`}>
          <Heading level={2} size="xl" className="font-bold">
            {post.headline}
          </Heading>
        </Link>
        <div className="flex-grow flex flex-col gap-2 min-h-14">
          <Text variant="secondary">{post.metaDescription}</Text>
          <div className="flex flex-wrap gap-2">
            {post.category && (
              <Link href={`/blog/category/${post.category.slug}`}>
                <Text size="sm" className="text-main font-semibold">
                  {post.category.title}
                </Text>
              </Link>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <PostDate date={new Date(post.publishedAt || post.createdAt)} />
          {post.readingTime ? (
            <>
              <Text variant="secondary">•</Text>
              <Text className="font-semibold">{post.readingTime} min read</Text>
            </>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
