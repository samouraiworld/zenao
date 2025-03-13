import { Text } from "@/components/texts/DefaultText";
import { PostCardLayout } from "@/components/cards/social-feed/post-card-layout";

//TODO

export function StandardPostCard() {
  return (
    <PostCardLayout>
      <div className="flex flex-row items-center gap-2">
        <Text variant="secondary">xxxxxxx</Text>
      </div>
      <Text>
        xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
        xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxxxxx xxxxx xxxxx xxxxx xxxxx
        xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
        xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
        xxxxx xxxxx xxxxx xxxxx xxxxx xx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx
        xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx xxxxx{" "}
      </Text>
    </PostCardLayout>
  );
}
