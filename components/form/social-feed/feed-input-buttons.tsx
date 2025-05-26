"use client";

import { Dispatch, SetStateAction } from "react";
import { SendHorizonalIcon, VoteIcon } from "lucide-react";
import { FeedInputMode } from "./standard-post-form";
import { cn } from "@/lib/tailwind";
import { ButtonBase } from "@/components/buttons/ButtonBases";

export function FeedInputButtons({
  buttonSize,
  feedInputMode,
  setFeedInputMode,
  isLoading = false,
  isReplying = false,
}: {
  buttonSize: number;
  feedInputMode: FeedInputMode;
  isReplying: boolean;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
  isLoading?: boolean;
}) {
  return (
    <>
      {!isReplying && (
        <ButtonBase
          variant="link"
          className={cn(
            "flex items-center justify-center rounded-full aspect-square cursor-pointer",
            feedInputMode === "POLL"
              ? "dark:bg-white bg-black"
              : "hover:bg-neutral-500/20",
          )}
          style={{
            height: buttonSize,
            width: buttonSize,
          }}
          onClick={() =>
            setFeedInputMode((feedInputMode) =>
              feedInputMode === "STANDARD_POST" ? "POLL" : "STANDARD_POST",
            )
          }
          aria-label="set type post"
          disabled={isLoading}
        >
          <VoteIcon
            className={cn(
              "!h-6 !w-6",
              feedInputMode === "POLL"
                ? "dark:text-black text-white"
                : "dark:text-white text-black",
            )}
          />
        </ButtonBase>
      )}
      <ButtonBase
        variant="link"
        className="dark:text-white text-black flex items-center justify-center rounded-full  aspect-square hover:bg-neutral-500/20 cursor-pointer"
        aria-label="submit post"
        style={{ height: buttonSize, width: buttonSize }}
        loading={isLoading}
        disabled={isLoading}
      >
        <SendHorizonalIcon className="!h-6 !w-6 dark:text-white" />
      </ButtonBase>
    </>
  );
}
