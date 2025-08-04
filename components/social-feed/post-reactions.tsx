import EmojiPicker, { Theme } from "emoji-picker-react";
import { Smile } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { ReactionView } from "@/app/gen/feeds/v1/feeds_pb";
import { Button } from "@/components/shadcn/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/shadcn/popover";
import { cn } from "@/lib/tailwind";
import Text from "@/components/widgets/texts/text";

type PostReactionsProps = {
  reactions: ReactionView[];
  canReact?: boolean;
  isPending?: boolean;
  onReactionChange?: (icon: string) => void | Promise<void>;
};

function PostReactions({
  reactions,
  canReact,
  isPending,
  onReactionChange,
}: PostReactionsProps) {
  const { resolvedTheme } = useTheme();
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  return (
    <div className="flex flex-row gap-2 overflow-auto">
      {canReact && (
        <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="reaction-btn rounded-full cursor-pointer size-8 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
            >
              <Smile size={16} color="hsl(var(--secondary-color))" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-fit bg-transparent p-0 border-none transition-all">
            <EmojiPicker
              theme={resolvedTheme === "dark" ? Theme.DARK : Theme.LIGHT}
              onEmojiClick={(choice) => {
                if (isPending) return;
                onReactionChange?.(choice.emoji);
                setEmojiPickerOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      )}

      <div className="flex flex-row gap-1 grow overflow-auto">
        {reactions
          .sort((a, b) => b.count - a.count)
          .map((reaction) => (
            <Button
              variant="outline"
              onClick={() => {
                if (isPending) return;
                if (canReact) onReactionChange?.(reaction.icon);
              }}
              className={cn(
                "flex flex-row items-center h-8 px-2 rounded-full gap-1 dark:bg-neutral-800/50 dark:hover:bg-neutral-800",
                reaction.userHasVoted && "border-[#EC7E17]",
              )}
              key={reaction.icon}
            >
              <Text className="text-sm">{reaction.icon}</Text>
              <Text variant="secondary" className="text-sm">
                {reaction.count}
              </Text>
            </Button>
          ))}
      </div>
    </div>
  );
}

export default PostReactions;
