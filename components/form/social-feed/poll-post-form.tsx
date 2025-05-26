"use client";

import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMediaQuery } from "react-responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { hoursToSeconds, minutesToSeconds } from "date-fns";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { pollFormSchema, PollFormSchemaType } from "../types";
import { FeedInputButtons } from "./feed-input-buttons";
import { useToast } from "@/app/hooks/use-toast";
import { PollFields } from "@/components/form/social-feed/poll-fields";
import { Textarea } from "@/components/shadcn/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import { useCreatePoll } from "@/lib/mutations/social-feed";
import { getQueryClient } from "@/lib/get-query-client";
import { PollKind } from "@/app/gen/polls/v1/polls_pb";
import { userAddressOptions } from "@/lib/queries/user";

export type FeedInputMode = "POLL" | "STANDARD_POST";

export function PollPostForm({
  eventId,
  feedInputMode,
  setFeedInputMode,
}: {
  eventId: string;
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
}) {
  const queryClient = getQueryClient();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const t = useTranslations("event-feed.poll-form");
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const { createPoll, isPending } = useCreatePoll(queryClient);

  const pollForm = useForm<PollFormSchemaType>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      question: "",
      options: [{ text: "" }, { text: "" }],
      allowMultipleOptions: false,
      duration: {
        days: 1,
        hours: 0,
        minutes: 0,
      },
    },
  });
  const question = pollForm.watch("question");
  const textareaMaxLength = pollFormSchema.shape.question._def.checks.find(
    (check) => check.kind === "max",
  )?.value;

  // Auto shrink and grow textarea
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaMaxHeight = 300;
  const textareaMinHeight = 48;
  const placeholder = isSmallScreen
    ? t("question-placeholder-sm")
    : t("question-placeholder-lg");

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [question]);

  const onSubmitPoll = async (values: PollFormSchemaType) => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      const pollKind = values.allowMultipleOptions
        ? PollKind.MULTIPLE_CHOICE
        : PollKind.SINGLE_CHOICE;

      const duration = BigInt(
        hoursToSeconds(values.duration.days * 24 + values.duration.hours) +
          minutesToSeconds(values.duration.minutes),
      );

      await createPoll({
        eventId,
        question: values.question,
        duration,
        options: values.options.map((option) => option.text),
        kind: pollKind,
        token: await getToken(),
        userAddress: userAddress || "",
      });

      pollForm.reset(
        {},
        {
          keepValues: false,
        },
      );

      toast({
        title: t("toast-poll-creation-success"),
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: t("toast-poll-creation-error"),
      });
      console.error("error", err);
    }
  };

  const onError = (errors: any) => {
    console.error("Form submission error:", errors);
  };

  return (
    <Form {...pollForm}>
      <form
        onSubmit={pollForm.handleSubmit(onSubmitPoll, onError)}
        className="flex flex-col gap-4 bg-accent p-4 rounded"
      >
        <div className="flex flex-row gap-4">
          <FormField
            rules={{ required: true }}
            control={pollForm.control}
            name="question"
            render={({ field }) => (
              <FormItem className="relative w-full">
                <FormControl>
                  <Textarea
                    ref={textareaRef}
                    onChange={(e) => field.onChange(e.target.value)}
                    style={{
                      minHeight: textareaMinHeight,
                      maxHeight: textareaMaxHeight,
                    }}
                    placeholder={placeholder}
                    maxLength={textareaMaxLength}
                    value={field.value}
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

        <PollFields form={pollForm} />
      </form>
    </Form>
  );
}
