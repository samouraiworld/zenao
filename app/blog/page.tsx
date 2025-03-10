import BlogPostCard from "./blog-post-card";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";
import { getPostsMetadata } from "@/lib/blog";

export default async function Blog() {
  const posts = await getPostsMetadata();

  return (
    <ScreenContainer>
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-2">
          <VeryLargeText className="truncate">Latest news</VeryLargeText>
          <Text className="line-clamp-2">Some description coming soon...</Text>
        </div>

        <div className="grid justify-items-center grid-cols-1 gap-8 lg:grid-cols-2">
          {posts.map((post) => (
            <BlogPostCard
              key={post.slug}
              slug={post.slug}
              title={post.title}
              description={post.title}
              date={new Date(post.date)}
            />
          ))}
        </div>
      </div>
    </ScreenContainer>
  );
}
