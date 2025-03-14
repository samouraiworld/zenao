import { Text } from "@/components/texts/DefaultText";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";
import { Post } from "@/app/gen/feeds/v1/feeds_pb";

//TODO

export function StandardPostCard({ post }: { post: Post }) {
  if (post.post.case !== "standard") {
    return null;
  }
  const standardPost = post.post.value;

  return (
    <PostCardLayout post={post}>
      <div className="w-full flex flex-col gap-2">
        <Text>{standardPost.content}</Text>
      </div>
    </PostCardLayout>
  );
}
