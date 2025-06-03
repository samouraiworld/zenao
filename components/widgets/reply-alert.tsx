"use client";

import { Info, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FeedPostFormSchemaType, ParentPostSchemaType } from "../form/types";
import { Alert, AlertTitle } from "../shadcn/alert";
import { ButtonBase } from "../buttons/ButtonBases";
import { profileOptions } from "@/lib/queries/profile";

export function ReplyAlert({
  parentPost,
  form,
}: {
  parentPost?: ParentPostSchemaType | undefined;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) {
  const { data } = useSuspenseQuery(profileOptions(parentPost?.author));

  if (!parentPost) {
    return null;
  }

  return (
    <Alert className="py-2 px-2">
      <div className="flex items-center">
        <div className="flex grow items-center gap-2">
          <Info className="h-4 w-4" />
          <AlertTitle>
            You are replying to{" "}
            {`${data?.displayName}'s ${parentPost.kind === "POLL" ? "poll" : "post"}`}{" "}
            !
          </AlertTitle>
        </div>
        <ButtonBase
          size="sm"
          variant="ghost"
          className="rounded-full w-6 h-6"
          onClick={() => form.setValue("parentPost", undefined)}
        >
          <X size={16} />
        </ButtonBase>
      </div>
    </Alert>
  );
}
