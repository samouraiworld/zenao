"use client";

import { useForm } from "react-hook-form";
import {
  AudioWaveformIcon,
  ImageIcon,
  PaperclipIcon,
  SendHorizonalIcon,
} from "lucide-react";
import { useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FormFieldTextArea } from "../widgets/form/form-field-textarea";
import { Form } from "../shadcn/form";
import { defaultScreenContainerMaxWidth } from "../layout/screen-container";
import { Button } from "../shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../shadcn/dropdown-menu";
import { ButtonBase } from "../widgets/buttons/button-bases";
import { cn } from "@/lib/tailwind";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { useToast } from "@/hooks/use-toast";
import useMarkdownUpload from "@/hooks/use-markdown-upload";
import { captureException } from "@/lib/report";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";

const FeedPostForm = () => {
  const { createStandardPost, isPending } = useCreateStandardPost();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { toast } = useToast();
  const t = useTranslations();
  const form = useForm<FeedPostFormSchemaType>({
    mode: "all",
    defaultValues: {
      content: "",
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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
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
        eventId: "", // TODO Replace
        content: values.content,
        parentId: values.parentPostId?.toString() ?? "",
        token,
        userAddress: userAddress ?? "",
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
    <Form {...form}>
      <div
        className={cn(
          "flex justify-center fixed left-0 bottom-0 z-50 w-full p-2 gap-2 bg-accent/70 backdrop-blur-md",
          "translate-y-32 animate-gotop-appear",
        )}
      >
        <form
          className="flex flex-1 items-center gap-2"
          style={{
            maxWidth: defaultScreenContainerMaxWidth,
          }}
          onSubmit={form.handleSubmit(onSubmitStandardPost)}
        >
          {/* Attachement menu button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className={cn(
                  "rounded-full w-8 h-8 hover:bg-transparent hover:ring-1 hover:ring-secondary-foreground hover:text-secondary-foreground",
                )}
                title="Upload"
              >
                {<PaperclipIcon />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem
                className="cursor-pointer"
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
              >
                <ImageIcon />
                Upload image
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
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
              >
                <AudioWaveformIcon />
                Upload audio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <FormFieldTextArea
            ref={textareaRef}
            className="rounded-xl w-full"
            control={form.control}
            name="content"
            placeholder="Enter your message"
            disabled={isPending}
          />
          <input
            type="file"
            onChange={handleAudioChange}
            ref={hiddenAudioInputRef}
            className="hidden"
            disabled={uploading}
          />
          <input
            type="file"
            onChange={handleImageChange}
            ref={hiddenImgInputRef}
            className="hidden"
            disabled={uploading}
          />
          <ButtonBase
            className={cn(
              "rounded-full w-8 h-8 hover:bg-transparent hover:ring-1 hover:ring-secondary-foreground hover:text-secondary-foreground",
            )}
            type="submit"
            loading={isPending}
            disabled={isPending}
          >
            {<SendHorizonalIcon />}
          </ButtonBase>
        </form>
      </div>
    </Form>
  );
};

export default FeedPostForm;
