import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { Loader2, AudioWaveform } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useRef, memo } from "react";

import { captureException } from "@sentry/nextjs";
import PortfolioPreviewDialog from "../dialogs/portfolio-preview-dialog";
import PortfolioUploadVideoDialog from "../dialogs/portfolio-upload-video-dialog";
import { Web3Image } from "../widgets/images/web3-image";
import EmptyList from "../widgets/lists/empty-list";
import {
  AUDIO_FILE_SIZE_LIMIT,
  AUDIO_FILE_SIZE_LIMIT_MB,
  IMAGE_FILE_SIZE_LIMIT,
  IMAGE_FILE_SIZE_LIMIT_MB,
} from "../features/event/constants";
import { MarkdownPreview } from "../widgets/markdown-preview";
import { UploadMediasButtons } from "./upload-medias-buttons";
import Heading from "@/components/widgets/texts/heading";
import { cn } from "@/lib/tailwind";
import { PortfolioItem, PortfolioUploadVideoSchemaType } from "@/types/schemas";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/files";

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

export function PortfolioTab({
  portfolioItems,
  isOwner,
  onSave,
}: {
  portfolioItems: PortfolioItem[];
  isOwner: boolean;
  onSave: (
    newPortfolio: PortfolioItem[],
    itemType: "image" | "video" | "audio",
  ) => Promise<void>;
}) {
  const { toast } = useToast();

  const [localPortfolio, setLocalPortfolio] =
    useState<PortfolioItem[]>(portfolioItems);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [previewDialogState, setPreviewDialogState] = useState<{
    isOpen: boolean;
    item: PortfolioItem;
  }>({ isOpen: false, item: {} as never });

  const t = useTranslations("portfolio");

  const handleSave = async (
    newPortfolio: PortfolioItem[],
    itemType: "image" | "video" | "audio",
  ) => {
    try {
      //   const token = await getToken();
      //   if (!token) throw new Error("invalid clerk token");

      //   const bio = serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
      //     profile.bio,
      //     { ...profile, portfolio: newPortfolio },
      //   );

      //   await editUser({
      //     realmId: address,
      //     token,
      //     avatarUri: userProfile?.avatarUri ?? "",
      //     displayName: userProfile?.displayName ?? "",
      //     bio,
      //   });

      await onSave(newPortfolio, itemType);

      setLocalPortfolio(newPortfolio);
      toast({ title: t("upload-file-success") });
    } catch (error) {
      captureException(error);
      toast({ title: t("error-saving"), variant: "destructive" });
    }
  };

  const onDelete = async (item: PortfolioItem) => {
    if (!isOwner) return;

    try {
      setIsDeleting(true);
      const updated = localPortfolio.filter((p) => p.id !== item.id);
      await handleSave(updated, item.type);

      toast({ title: t("delete-file-success") });
      setPreviewDialogState({ isOpen: false, item: {} as never });
    } catch (err) {
      captureException(err);
      toast({ title: t("error-file-deleting"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const onUpload = async (
    fileType: "image" | "audio",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);

      const uri = await uploadFile(
        file,
        fileType === "image" ? IMAGE_FILE_SIZE_LIMIT : AUDIO_FILE_SIZE_LIMIT,
      );

      const newItem: PortfolioItem = {
        id: crypto.randomUUID(),
        type: fileType,
        name: file.name,
        uri,
        uploadedAt: new Date(),
      };

      await handleSave([newItem, ...localPortfolio], fileType);
    } catch (error: unknown) {
      captureException(error);
      if (
        error instanceof Error &&
        error.message.includes("File size exceeds limit")
      ) {
        toast({
          variant: "destructive",
          title: t("error-filesize-exceeds-limit", {
            size:
              fileType === "image"
                ? IMAGE_FILE_SIZE_LIMIT_MB
                : AUDIO_FILE_SIZE_LIMIT_MB,
          }),
        });
      } else {
        toast({ title: t("error-file-uploading"), variant: "destructive" });
      }
    } finally {
      setIsUploading(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
      if (audioFileInputRef.current) audioFileInputRef.current.value = "";
    }
  };

  const handleVideoAdded = async (data: PortfolioUploadVideoSchemaType) => {
    const newItem: PortfolioItem = {
      id: crypto.randomUUID(),
      type: "video",
      name: data.uri,
      uri: data.uri,
      uploadedAt: new Date(),
    };

    await handleSave([newItem, ...localPortfolio], "video");
  };

  return (
    <div className="relative">
      <PortfolioPreviewDialog
        isOpen={previewDialogState.isOpen}
        onOpenChange={(open) =>
          setPreviewDialogState({ isOpen: open, item: {} as never })
        }
        item={previewDialogState.item}
        onDelete={onDelete}
        isDeleting={isDeleting}
        isAdmin={isOwner}
      />
      <PortfolioUploadVideoDialog
        isOpen={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        onVideoAdded={handleVideoAdded}
      />

      {isOwner && !!localPortfolio.length && (
        <UploadMediasButtons
          imageFileInputRef={imageFileInputRef}
          audioFileInputRef={audioFileInputRef}
          isUploading={isUploading}
          setVideoDialogOpen={setVideoDialogOpen}
          className="mb-2"
        />
      )}

      {!!localPortfolio.length && (
        <Heading level={2} size="lg">
          {t("recent-media-uploaded")} ({localPortfolio.length})
        </Heading>
      )}
      {/* Image upload */}
      <input
        ref={imageFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onUpload("image", e)}
      />
      {/* Audio upload */}
      <input
        ref={audioFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onUpload("audio", e)}
      />
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          maxWidth: "100%",
        }}
      >
        {!localPortfolio.length && !isUploading && (
          <div className="flex flex-col justify-center text-muted-foreground gap-4">
            <EmptyList
              title={t("no-media-title")}
              description={isOwner ? t("no-media-description") : undefined}
            />

            {isOwner && (
              <UploadMediasButtons
                imageFileInputRef={imageFileInputRef}
                audioFileInputRef={audioFileInputRef}
                isUploading={isUploading}
                setVideoDialogOpen={setVideoDialogOpen}
              />
            )}
          </div>
        )}

        {isUploading && (
          <div className="max-w-[350px] w-full">
            <AspectRatio ratio={16 / 9}>
              <div className="h-full flex justify-center items-center border rounded border-muted">
                <Loader2 className="animate-spin" />
              </div>
            </AspectRatio>
          </div>
        )}

        {localPortfolio.map((item) => (
          <div
            className={cn(
              "w-full max-w-full relative",
              localPortfolio.length < 2 && "max-w-[400px]",
            )}
            key={item.id}
          >
            {item.type === "image" && (
              <AspectRatio
                ratio={16 / 9}
                onClick={() => setPreviewDialogState({ isOpen: true, item })}
              >
                <div className="h-full border rounded border-muted overflow-hidden">
                  <Web3Image
                    src={item.uri}
                    alt={`${item.name}-bg`}
                    fill
                    className={cn(
                      "object-cover rounded blur brightness-[75%]",
                      "hover:brightness-[60%] transition-all",
                    )}
                  />
                  <Web3Image
                    src={item.uri}
                    alt={item.name}
                    fill
                    className={cn(
                      "object-contain rounded cursor-pointer",
                      "hover:brightness-[60%] transition-all",
                    )}
                  />
                </div>
              </AspectRatio>
            )}

            {item.type === "audio" && (
              <AspectRatio
                ratio={16 / 9}
                onClick={() => setPreviewDialogState({ isOpen: true, item })}
              >
                <div className="h-full border rounded border-muted overflow-hidden flex items-center justify-center bg-muted cursor-pointer hover:brightness-90 transition">
                  <AudioWaveform className="w-16 h-16 text-main" />
                </div>
              </AspectRatio>
            )}

            {item.type === "video" && (
              <AspectRatio
                ratio={16 / 9}
                onClick={() => setPreviewDialogState({ isOpen: true, item })}
              >
                <div className="h-full w-full border rounded border-muted overflow-hidden flex items-center justify-center bg-muted cursor-pointer hover:brightness-90 transition">
                  <MemoizedVideoPreview uri={item.uri} />
                </div>
              </AspectRatio>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
