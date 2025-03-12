import { Metadata } from "next";
import BlogPostCard from "./blog-post-card";
import BlogHeader from "./blog-header";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { getPostsMetadata } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | Zenao",
  description: "Zenao blog",
};

export default async function Blog() {
  const posts = await getPostsMetadata();

  return (
    <ScreenContainer>
      <div className="flex flex-col gap-12">
        <BlogHeader />
        <div className="grid justify-items-center grid-cols-1 gap-8 lg:grid-cols-2">
          {posts.map((post) => (
            <BlogPostCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              description={post.title}
              previewImageUrl={post.previewImageUrl}
              date={new Date(post.date)}
            />
          ))}
        </div>
      </div>
    </ScreenContainer>
  );
}
