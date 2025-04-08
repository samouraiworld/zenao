import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/nextjs";
import { useMediaQuery } from "react-responsive";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

export type FeedInputMode = "POLL" | "STANDARD_POST";

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
    ? "Say something"
    : "Don't be shy, say something!";
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

  const onSubmitStandardPost = async (values: StandardPostFormSchemaType) => {
    try {
      setIsLoading(true);
      const token = await getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }

      //TODO: Plug endpoint here
      console.log(values);

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
          />
        </div>
      </form>
    </Form>
  );
}
