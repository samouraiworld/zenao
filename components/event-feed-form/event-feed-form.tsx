"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { PollPostForm } from "./poll-post-form";
import { FeedInputMode, StandardPostForm } from "./standard-post-form";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { captureException } from "@/lib/report";
import { userInfoOptions } from "@/lib/queries/user";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { useToast } from "@/hooks/use-toast";

const _eventTabs = ["description", "discussion", "votes"] as const;
export type EventTab = (typeof _eventTabs)[number];

const EventFeedForm = ({
  eventId,
  form,
}: {
  eventId: string;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) => {
  const { toast } = useToast();

  const { createStandardPost, isPending } = useCreateStandardPost();
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const userRealmId = userInfo?.realmId || "";

  const t = useTranslations("event-feed.standard-post-form");

  const formContainerRef = useRef<HTMLDivElement>(null);
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");

  useEffect(() => {
    if (feedInputMode === "POLL") {
      form.setValue("kind", "POLL");
    } else {
      form.setValue("kind", "STANDARD_POST");
    }
  }, [feedInputMode, form]);

  const onSubmitStandardPost = async (values: FeedPostFormSchemaType) => {
    try {
      if (values.kind !== "STANDARD_POST") {
        throw new Error("invalid form");
      }

      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await createStandardPost({
        orgType: "event",
        orgId: eventId,
        content: values.content,
        parentId: values.parentPostId?.toString() ?? "",
        token,
        userRealmId: userRealmId ?? "",
        tags: [],
      });

      toast({
        title: t("toast-post-creation-success"),
      });

      form.resetField("content", { defaultValue: "" });
      form.resetField("parentPostId");
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
    }
  };

  return (
    <div
      ref={formContainerRef}
      className="flex justify-center w-full transition-all duration-300 bg-secondary/80"
    >
      <div className="w-full">
        {feedInputMode === "POLL" ? (
          <PollPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            form={form}
          />
        ) : (
          <StandardPostForm
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            form={form}
            onSubmit={onSubmitStandardPost}
            isLoading={isPending}
          />
        )}
      </div>
    </div>
  );
};

export default EventFeedForm;
