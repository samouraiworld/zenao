import { PollCard } from "@/components/cards/poll-card";
import { fakePolls } from "@/app/event/[id]/fake-polls";
import { PostCard } from "@/components/cards/post-card";

export function EventFeed(
  {
    // id,
    // userId,
  }: {
    // id: string;
    // userId: string | null;
  },
) {
  return (
    <>
      <div className="w-full h-[100px] bg-amber-100 mb-4" />

      <div className="flex flex-col w-full h-[800px] bg-amber-100 gap-2">
        <PostCard />
        <PollCard poll={fakePolls[0]} />
        <PollCard poll={fakePolls[1]} />

        <PostCard />
        <PostCard />
        <PollCard poll={fakePolls[2]} />

        <PostCard />
        <PostCard />
        <PollCard poll={fakePolls[3]} />
      </div>
    </>
  );
}
