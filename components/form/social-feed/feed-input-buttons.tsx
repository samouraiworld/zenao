"use client";

import { Dispatch, SetStateAction } from "react";
import { SendHorizonal, Vote } from "lucide-react";
import { FeedInputMode } from "./feed-input";
import { cn } from "@/lib/tailwind";

export function FeedInputButtons({
  buttonSize,
  feedInputMode,
  setFeedInputMode,
}: {
  buttonSize: number;
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
}) {
  return (
    <>
      <div
        className={cn(
          "flex items-center justify-center rounded-full aspect-square cursor-pointer",
          feedInputMode === "POLL" ? "bg-white " : "hover:bg-neutral-700",
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
      >
        <Vote color={feedInputMode === "POLL" ? "black" : "white"} size={24} />
      </div>
      <div
        className="flex items-center justify-center rounded-full  aspect-square hover:bg-neutral-700 cursor-pointer"
        style={{ height: buttonSize, width: buttonSize }}
      >
        <SendHorizonal color="white" size={24} />
      </div>
    </>
  );
}
