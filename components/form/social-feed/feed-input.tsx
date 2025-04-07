import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { SendHorizonal, Vote } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useMediaQuery } from "react-responsive";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/app/hooks/use-toast";
import {
  pollFormSchema,
  PollFormSchemaType,
  standardPostFormSchema,
  StandardPostFormSchemaType,
} from "@/components/form/types";
import { cn } from "@/lib/tailwind";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
} from "@/components/shadcn/form";
import { Textarea } from "@/components/shadcn/textarea";
import { PollFields } from "@/components/form/social-feed/poll-fields";

export type FeedInputMode = "POLL" | "STANDARD_POST";

export function FeedInputPoll({
  feedInputMode,
  setFeedInputMode,
}: {
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });

  // TODO: Disable stuff if isLoading
  const [_isLoading, setIsLoading] = useState(false);

  const pollForm = useForm<PollFormSchemaType>({
    resolver: zodResolver(pollFormSchema),
    defaultValues: {
      question: "é&eezg",
      options: [{ text: "" }, { text: "" }],
      allowMultipleOptions: false,
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
  const onSubmitPoll = async (_values: PollFormSchemaType) => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      //TODO: Plug endpoint here

      pollForm.reset();
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
        <div className="flex flex-row items-center gap-4">
          <FormField
            rules={{ required: true }}
            control={pollForm.control}
            name="question"
            render={({ field }) => (
              <FormItem className="relative w-full space-y-0">
                <FormControl>
                  <Textarea
                    ref={textareaRef}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="cursor-pointer border-0 focus-visible:ring-transparent rounded-xl px-4 placeholder:text-primary-color hover:bg-neutral-700 text-md py-3"
                    style={{
                      minHeight: textareaMinHeight,
                      maxHeight: textareaMaxHeight,
                    }}
                    placeholder={placeholder}
                    maxLength={textareaMaxLength}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FeedInputButtons
            buttonSize={textareaMinHeight}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
          />
        </div>

        <PollFields form={pollForm} />
      </form>
    </Form>
  );
}

export function FeedInput({
  feedInputMode,
  setFeedInputMode,
}: {
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
}) {
  const { getToken } = useAuth();
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });

  // TODO: Disable stuff if isLoading
  const [_isLoading, setIsLoading] = useState(false);

  const standardPostForm = useForm<StandardPostFormSchemaType>({
    resolver: zodResolver(standardPostFormSchema),
    defaultValues: {
      content: "rzfezffef",
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
    ? "Say something"
    : "Don't be shy, say something!";
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  const onSubmitStandardPost = async (_values: StandardPostFormSchemaType) => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      //TODO: Plug endpoint here

      standardPostForm.reset();
      toast({
        // title: t("toast-creation-success"),
        title: "TODO: trad (Post creation success)",
      });
      // router.push(`/polls`);
    } catch (err) {
      toast({
        variant: "destructive",
        // title: t("toast-creation-error"),
        title: "TODO: trad (Post creation error)",
      });
      console.error("error", err);
    }
    setIsLoading(false);
  };

  return (
    <Form {...standardPostForm}>
      <form
        onSubmit={standardPostForm.handleSubmit(onSubmitStandardPost)}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-row items-center gap-4">
          <FormField
            rules={{ required: true }}
            control={standardPostForm.control}
            name="content"
            render={({ field }) => (
              <FormItem className="relative w-full space-y-0">
                <FormControl>
                  <Textarea
                    ref={textareaRef}
                    onChange={(e) => field.onChange(e.target.value)}
                    className="cursor-pointer border-0 focus-visible:ring-transparent rounded-xl px-4 placeholder:text-primary-color hover:bg-neutral-700 text-md py-3"
                    style={{
                      minHeight: textareaMinHeight,
                      maxHeight: textareaMaxHeight,
                    }}
                    placeholder={placeholder}
                    maxLength={textareaMaxLength}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FeedInputButtons
            buttonSize={textareaMinHeight}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
          />
        </div>
      </form>
    </Form>
  );
}

function FeedInputButtons({
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
        <Vote color={feedInputMode === "POLL" ? "black" : "white"} size={22} />
      </div>
      <div
        className="flex items-center justify-center rounded-full  aspect-square hover:bg-neutral-700 cursor-pointer"
        style={{ height: buttonSize, width: buttonSize }}
      >
        <SendHorizonal color="white" size={22} />
      </div>
    </>
  );
}
