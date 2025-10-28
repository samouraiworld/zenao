"use client";

import { Dispatch, SetStateAction } from "react";
import { Save, SendHorizonalIcon, VoteIcon } from "lucide-react";
import { cn } from "@/lib/tailwind";
import { ButtonBase } from "@/components/widgets/buttons/button-bases";
import { SocialFeedPostType } from "@/lib/social-feed";

export default function SocialFeedActionButtons({
  postTypeMode,
  setPostTypeMode,
  isLoading = false,
  isReplying = false,
  isEditing = false,
  isDisabled = false,
}: {
  postTypeMode: SocialFeedPostType;
  isReplying: boolean;
  setPostTypeMode: Dispatch<SetStateAction<SocialFeedPostType>>;
  isLoading?: boolean;
  isEditing?: boolean;
  isDisabled?: boolean;
}) {
  return (
    <>
      {!isReplying && (
        <ButtonBase
          variant="link"
          className={cn(
            "flex items-center justify-center rounded-full aspect-square cursor-pointer w-7 h-7 md:w-12 md:h-12",
            postTypeMode === "POLL"
              ? "dark:bg-white bg-black"
              : "hover:bg-neutral-500/20",
          )}
          onClick={() =>
            setPostTypeMode((postTypeMode) =>
              postTypeMode === "STANDARD_POST" ? "POLL" : "STANDARD_POST",
            )
          }
          aria-label="set type post"
          disabled={isLoading}
        >
          <VoteIcon
            className={cn(
              "w-5 h-5 md:!h-6 md:!w-6",
              postTypeMode === "POLL"
                ? "dark:text-black text-white"
                : "dark:text-white text-black",
            )}
          />
        </ButtonBase>
      )}
      <ButtonBase
        variant="link"
        className={cn(
          "dark:text-white text-black flex items-center justify-center rounded-full aspect-square",
          "hover:bg-neutral-500/20 cursor-pointer w-7 h-7 md:w-12 md:h-12",
        )}
        aria-label="submit post"
        loading={isLoading}
        disabled={isDisabled}
      >
        {isEditing ? (
          <Save className="w-5 h-5 md:!h-6 md:!w-6 dark:text-white" />
        ) : (
          <SendHorizonalIcon className="w-5 h-5 md:!h-6 md:!w-6 dark:text-white" />
        )}
      </ButtonBase>
    </>
  );
}
