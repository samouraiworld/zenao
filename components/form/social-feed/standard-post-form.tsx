import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMediaQuery } from "react-responsive";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FeedInputButtons } from "./feed-input-buttons";
import { useToast } from "@/app/hooks/use-toast";
import {
  standardPostFormSchema,
  StandardPostFormSchemaType,
} from "@/components/form/types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { Textarea } from "@/components/shadcn/textarea";
import { getQueryClient } from "@/lib/get-query-client";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";

export type FeedInputMode = "POLL" | "STANDARD_POST";

export function StandardPostForm({
  eventId,
  feedInputMode,
  setFeedInputMode,
}: {
  eventId: string;
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
}) {
  const queryClient = getQueryClient();
  const { createStandardPost, isPending } = useCreateStandardPost(queryClient);
  const t = useTranslations("event-feed.standard-post-form");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });

  const standardPostForm = useForm<StandardPostFormSchemaType>({
    resolver: zodResolver(standardPostFormSchema),
    defaultValues: {
      content: "",
    },
  });
  const content = standardPostForm.watch("content");
  const textareaMaxLength =
    standardPostFormSchema.shape.content._def.checks.find(
      (check) => check.kind === "max",
    )?.value;

  // Auto shrink and grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaMaxHeight = 300;
  const textareaMinHeight = 48;
  const placeholder = isSmallScreen
    ? t("message-placeholder-sm")
    : t("message-placeholder-lg");
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  const onSubmitStandardPost = async (values: StandardPostFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      await createStandardPost({
        eventId,
        content: values.content,
        token,
        userAddress: userAddress ?? "",
        tags: [],
      });

      standardPostForm.reset();
      toast({
        title: t("toast-post-creation-success"),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
      console.error("error", err);
    }
  };

  return (
    <Form {...standardPostForm}>
      <form
        onSubmit={standardPostForm.handleSubmit(onSubmitStandardPost)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-row gap-4">
          <FormField
            rules={{ required: true }}
            control={standardPostForm.control}
            name="content"
            render={({ field }) => (
              <FormItem className="relative w-full">
                <FormControl>
                  <Textarea
                    ref={textareaRef}
                    onChange={(e) => field.onChange(e.target.value)}
                    className={`!min-h-[${textareaMinHeight}px] !max-h-[${textareaMaxHeight}px]`}
                    placeholder={placeholder}
                    maxLength={textareaMaxLength}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FeedInputButtons
            buttonSize={textareaMinHeight}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            isLoading={isPending}
          />
        </div>
      </form>
    </Form>
  );
}
