"use client";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useMediaQuery } from "react-responsive";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { hoursToMilliseconds, minutesToMilliseconds } from "date-fns";
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
import { useCreatePoll } from "@/lib/mutations/create-poll";
import { getQueryClient } from "@/lib/get-query-client";
import { PollKind } from "@/app/gen/polls/v1/polls_pb";

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
  const { getToken } = useAuth();
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const { createPoll, isPending } = useCreatePoll(queryClient);

  // TODO: Disable stuff if isLoading
  const [_isLoading, setIsLoading] = useState(false);

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
    ? "Ask something"
    : "What do you wanna ask to the community?";
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [question]);

  // Functions
  const onSubmitPoll = async (values: PollFormSchemaType) => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      const pollKind = values.allowMultipleOptions
        ? PollKind.MULTIPLE_CHOICE
        : PollKind.SINGLE_CHOICE;

      // TODO Calculate duration here
      const duration = BigInt(
        (hoursToMilliseconds(
          values.duration.days * 24 + values.duration.hours,
        ) +
          minutesToMilliseconds(values.duration.minutes)) *
          1_000_000,
      );

      console.log("duration", duration);

      // Call backend
      await createPoll({
        eventId,
        question: values.question,
        duration,
        options: values.options.map((option) => option.text),
        kind: pollKind,
        token: await getToken(),
      });
      // pollForm.reset();

      toast({
        // title: t("toast-creation-success"),
        title: "TODO: trad (Poll creation success)",
      });
      // router.push(`/polls`);
    } catch (err) {
      toast({
        variant: "destructive",
        // title: t("toast-creation-error"),
        title: "TODO: trad (Poll creation error)",
      });
      console.error("error", err);
    }
    setIsLoading(false);
  };

  return (
    <Form {...pollForm}>
      <form
        onSubmit={pollForm.handleSubmit(onSubmitPoll)}
        className="flex flex-col gap-4"
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
