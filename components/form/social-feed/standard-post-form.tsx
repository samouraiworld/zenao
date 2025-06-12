import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AudioWaveform, ImageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import React, { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useMediaQuery } from "react-responsive";
import { UseFormReturn } from "react-hook-form";
import { FeedInputButtons } from "./feed-input-buttons";
import { useToast } from "@/app/hooks/use-toast";
import { ButtonBase } from "@/components/buttons/button-bases";
import { MarkdownPreview } from "@/components/common/markdown-preview";
import {
  FeedPostFormSchemaType,
  standardPostFormSchema,
} from "@/components/form/types";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/shadcn/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/shadcn/tabs";
import { Textarea } from "@/components/shadcn/textarea";
import Text from "@/components/texts/text";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";
import { cn } from "@/lib/tailwind";
import { captureException } from "@/lib/report";
import useMarkdownUpload from "@/app/hooks/use-markdown-upload";

export type FeedInputMode = "POLL" | "STANDARD_POST";

export function StandardPostForm({
  eventId,
  feedInputMode,
  setFeedInputMode,
  form,
  onSuccess,
}: {
  eventId: string;
  feedInputMode: FeedInputMode;
  setFeedInputMode: Dispatch<SetStateAction<FeedInputMode>>;
  form: UseFormReturn<FeedPostFormSchemaType>;
  onSuccess?: () => void;
}) {
  const { createStandardPost, isPending } = useCreateStandardPost();
  const t = useTranslations("event-feed.standard-post-form");
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { toast } = useToast();
  const isSmallScreen = useMediaQuery({ maxWidth: 640 });
  const content = form.watch("content");
  const parentPostId = form.watch("parentPostId");

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

  const hiddenAudioInputRef = useRef<HTMLInputElement>(null);
  const hiddenImgInputRef = useRef<HTMLInputElement>(null);

  const { uploadMdFile, uploading, setCursor } = useMarkdownUpload(textareaRef);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected.",
      });
      return;
    }

    await uploadMdFile(
      file,
      "image",
      (text) => {
        form.setValue("content", text);
      },
      (text) => {
        form.setValue("content", text);
        textareaRef.current?.focus();
      },
    );
  };

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target?.files?.[0];
    if (!file) {
      toast({
        variant: "destructive",
        title: "No file selected.",
      });
      return;
    }

    await uploadMdFile(
      file,
      "audio",
      (text) => {
        form.setValue("content", text);
      },
      (text) => {
        form.setValue("content", text);
        textareaRef.current?.focus();
      },
    );
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = `${textareaMinHeight}px`;
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [content]);

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
        eventId,
        content: values.content,
        parentId: values.parentPostId?.toString() ?? "",
        token,
        userAddress: userAddress ?? "",
        tags: [],
      });

      onSuccess?.();

      toast({
        title: t("toast-post-creation-success"),
      });
    } catch (err) {
      captureException(err);
      toast({
        variant: "destructive",
        title: t("toast-post-creation-error"),
      });
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmitStandardPost)}
        className="flex flex-col gap-4 p-4 rounded"
      >
        <div className="flex flex-row gap-4">
          <Tabs defaultValue="form" className="w-full">
            <div className="w-full flex justify-between">
              <TabsList className="p-0 h-fit">
                <TabsTrigger value="form">
                  <Text size="sm">Write</Text>
                </TabsTrigger>
                <TabsTrigger value="preview">
                  <Text size="sm">Preview</Text>
                </TabsTrigger>
              </TabsList>

              <div className="flex flex-row gap-2 items-center">
                {/* Image upload button */}
                <ButtonBase
                  variant="link"
                  className={cn(
                    "flex items-center justify-center rounded-full aspect-square cursor-pointer",
                    "hover:bg-neutral-500/20",
                  )}
                  title="Upload image"
                  onClick={(e) => {
                    e.preventDefault();
                    if (uploading) return;

                    setCursor(
                      textareaRef.current?.selectionStart ??
                        textareaRef.current?.textLength ??
                        0,
                    );
                    hiddenImgInputRef.current?.click();
                  }}
                  aria-label="upload image"
                  style={{
                    height: textareaMinHeight,
                    width: textareaMinHeight,
                  }}
                >
                  <ImageIcon className="!h-6 !w-6" />
                </ButtonBase>
                <input
                  type="file"
                  onChange={handleImageChange}
                  ref={hiddenImgInputRef}
                  className="hidden"
                  disabled={uploading}
                />
                {/* Audio */}
                <ButtonBase
                  variant="link"
                  className={cn(
                    "flex items-center justify-center rounded-full aspect-square cursor-pointer",
                    "hover:bg-neutral-500/20",
                  )}
                  title="Upload audio"
                  onClick={(e) => {
                    e.preventDefault();
                    if (uploading) return;

                    setCursor(
                      textareaRef.current?.selectionStart ??
                        textareaRef.current?.textLength ??
                        0,
                    );
                    hiddenAudioInputRef.current?.click();
                  }}
                  aria-label="upload audio"
                  style={{
                    height: textareaMinHeight,
                    width: textareaMinHeight,
                  }}
                >
                  <AudioWaveform className="!h-6 !w-6" />
                </ButtonBase>
                <input
                  type="file"
                  onChange={handleAudioChange}
                  ref={hiddenAudioInputRef}
                  className="hidden"
                  disabled={uploading}
                />
                <FeedInputButtons
                  buttonSize={textareaMinHeight}
                  feedInputMode={feedInputMode}
                  isReplying={!!parentPostId}
                  setFeedInputMode={setFeedInputMode}
                  isLoading={isPending}
                />
              </div>
            </div>
            <TabsContent value="form">
              <FormField
                rules={{ required: true }}
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem className="relative w-full">
                    <FormControl>
                      <Textarea
                        ref={textareaRef}
                        onChange={(e) => field.onChange(e.target.value)}
                        value={field.value}
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
            </TabsContent>
            <TabsContent value="preview" className={`!min-h-[70px]`}>
              {content.trim().length === 0 ? (
                <Text>Nothing to preview</Text>
              ) : (
                <MarkdownPreview markdownString={content} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
}
