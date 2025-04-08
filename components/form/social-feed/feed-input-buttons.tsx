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
}: {
  buttonSize: number;
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
  isLoading?: boolean;
}) {
  return (
    <>
      <ButtonBase
        variant="link"
        className={cn(
          "flex items-center justify-center rounded-full aspect-square cursor-pointer",
          feedInputMode === "POLL" ? "bg-white" : "hover:bg-neutral-700",
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
        disabled={isLoading}
      >
        <VoteIcon
          color={feedInputMode === "POLL" ? "black" : "white"}
          className="!h-6 !w-6"
        />
      </ButtonBase>
      <ButtonBase
        variant="link"
        className="flex items-center justify-center rounded-full  aspect-square hover:bg-neutral-700 cursor-pointer"
        style={{ height: buttonSize, width: buttonSize }}
        loading={isLoading}
        disabled={isLoading}
      >
        <SendHorizonalIcon color="white" className="!h-6 !w-6" />
      </ButtonBase>
    </>
  );
}
