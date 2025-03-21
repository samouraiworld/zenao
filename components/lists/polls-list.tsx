"use client";

import Text from "../texts/text";
import { PollPostCard } from "@/components/cards/social-feed/poll-post-card";
import { PollPostView } from "@/lib/social-feed";

function EmptyPollsList() {
  return (
    <div className="flex flex-col items-center gap-5 mt-10 text-center">
      <Text className="font-bold">No poll to show</Text>
      <Text size="sm" variant="secondary">
        There is no poll for this Event yet
      </Text>
    </div>
  );
}

export function PollsList({ list }: { list: PollPostView[] }) {
  return (
    <div className="space-y-4">
      {!list.length ? (
        <EmptyPollsList />
      ) : (
        list.map((pollPost, index) => (
          <PollPostCard key={index} pollPost={pollPost} />
        )) // TODO; Better key?
      )}
    </div>
  );
}
