import BlogPostCard from "./blog-post-card";
import { ScreenContainer } from "@/components/layout/ScreenContainer";
import { Text } from "@/components/texts/DefaultText";
import { VeryLargeText } from "@/components/texts/VeryLargeText";

export default function Blog() {
  return (
    <ScreenContainer>
      <div className="flex flex-col gap-12">
        <div className="flex flex-col gap-2">
          <VeryLargeText className="truncate">Latest news</VeryLargeText>
          <Text className="line-clamp-2">Some description coming soon...</Text>
        </div>

        {/* Layout by columns */}
        <div className="grid justify-items-center grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Layout by rows */}
          {/* <div className="grid justify-items-center gap-8 grid-cols-1"> */}
          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />

          <BlogPostCard
            title="Blog post title"
            description="Blog post description"
            url="/blog/post"
          />
        </div>
      </div>
    </ScreenContainer>
  );
}
