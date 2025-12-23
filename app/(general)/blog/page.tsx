import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import BlogPostCard from "./blog-post-card";
import BlogHeader from "./blog-header";
import { ScreenContainer } from "@/components/layout/screen-container";
import { getPostsMetadata } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Zenao",
  description:
    "Find the latest articles, news, and updates about Zenao in our blog.",
};

export default async function Blog() {
  const posts = await getPostsMetadata();
  const t = await getTranslations("blog");

  if (!posts.length) {
    return (
      <ScreenContainer>
        <div className="flex flex-col gap-12">
          <BlogHeader />
          <p className="text-center text-main">{t("no-blog-posts-title")}</p>
        </div>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <div className="flex flex-col gap-12">
        <BlogHeader />
        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {posts.map((post) => (
            <BlogPostCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              author={post.author}
              category={post.category}
              description={post.description}
              previewImageUrl={post.previewImageUrl}
              publishedAt={new Date(post.date)}
            />
          ))}
        </div>
      </div>
    </ScreenContainer>
  );
}
