"use client";

import { useForm } from "react-hook-form";
import {
  AudioWaveformIcon,
  ImageIcon,
  PaperclipIcon,
  SaveIcon,
  SendHorizonalIcon,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";
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
import Text from "../widgets/texts/text";
import { cn } from "@/lib/tailwind";
import { FeedPostFormSchemaType } from "@/types/schemas";
import { useToast } from "@/hooks/use-toast";
import useMarkdownUpload from "@/hooks/use-markdown-upload";
import { captureException } from "@/lib/report";
import { useCreateStandardPost } from "@/lib/mutations/social-feed";
import { userAddressOptions } from "@/lib/queries/user";

type FeedPostFormProps = {
  orgId: string;
  orgType: "event" | "community";
  editMode: boolean;
  postInEdition: { postId: string; content: string } | null;
  onEdit?: (
    postId: string,
    values: FeedPostFormSchemaType,
  ) => void | Promise<void>;
  onCancelEdit?: () => void | Promise<void>;
  isEditing?: boolean;
};

const FeedPostForm = ({
  orgId,
  orgType,
  onEdit,
  editMode,
  onCancelEdit,
  postInEdition,
  isEditing,
}: FeedPostFormProps) => {
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
      kind: "STANDARD_POST",
      content: "",
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
        orgId,
        orgType,
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

  const onSubmit = async (values: FeedPostFormSchemaType) => {
    if (editMode && postInEdition) {
      await onEdit?.(postInEdition.postId, values);
      form.resetField("content");
    } else {
      await onSubmitStandardPost(values);
    }
  };

  useEffect(() => {
    form.clearErrors();
    if (!postInEdition) {
      form.resetField("content");
    } else {
      form.setValue("content", postInEdition.content);
    }
  }, [form, postInEdition]);

  return (
    <Form {...form}>
      {editMode && (
        <div className="fixed left-0 top-0 !mt-0 w-screen h-screen bg-accent/50 backdrop-blur-md"></div>
      )}
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
          onSubmit={form.handleSubmit(onSubmit)}
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

          <div className="flex flex-1 flex-col gap-2">
            {editMode && (
              <div className="flex w-full items-center justify-between">
                <Text size="sm" variant="secondary">
                  (Editing)
                </Text>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-4 h-4"
                  title="Cancel modification"
                  onClick={() => onCancelEdit?.()}
                >
                  <X className="!w-4 !h-4" />
                </Button>
              </div>
            )}
            <FormFieldTextArea
              ref={textareaRef}
              className="rounded-xl w-full"
              control={form.control}
              name="content"
              placeholder="Enter your message"
              disabled={uploading || isPending || isEditing}
            />
            <input
              type="file"
              onChange={handleAudioChange}
              ref={hiddenAudioInputRef}
              className="hidden"
              disabled={uploading || isPending || isEditing}
            />
            <input
              type="file"
              onChange={handleImageChange}
              ref={hiddenImgInputRef}
              className="hidden"
              disabled={uploading || isPending || isEditing}
            />
          </div>
          <ButtonBase
            className={cn(
              "rounded-full w-8 h-8 hover:bg-transparent hover:ring-1 hover:ring-secondary-foreground hover:text-secondary-foreground",
            )}
            type="submit"
            loading={isPending || isEditing}
            disabled={isPending || isEditing}
          >
            {editMode ? <SaveIcon /> : <SendHorizonalIcon />}
          </ButtonBase>
        </form>
      </div>
    </Form>
  );
};

export default FeedPostForm;
