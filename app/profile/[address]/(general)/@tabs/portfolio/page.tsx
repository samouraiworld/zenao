"use client";

import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  AudioWaveform,
  ImageIcon,
  Loader2,
  Video,
  Trash2Icon,
} from "lucide-react";
import { memo, useRef, useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { useAuth } from "@clerk/nextjs";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { useEditUserProfile } from "@/lib/mutations/profile";
import { profileOptions } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import {
  PortfolioItem,
  PortfolioUploadVideoSchemaType,
  gnoProfileDetailsSchema,
  GnoProfileDetails,
  RealmId,
} from "@/types/schemas";
import { Button } from "@/components/shadcn/button";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/files";
import { captureException } from "@/lib/report";
import PortfolioPreviewDialog from "@/components/dialogs/portfolio-preview-dialog";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { cn } from "@/lib/tailwind";
import { addressFromRealmId } from "@/lib/gno";
import PortfolioUploadVideoDialog from "@/components/dialogs/portfolio-upload-video-dialog";
import {
  AUDIO_FILE_SIZE_LIMIT,
  AUDIO_FILE_SIZE_LIMIT_MB,
  IMAGE_FILE_SIZE_LIMIT,
  IMAGE_FILE_SIZE_LIMIT_MB,
} from "@/components/features/event/constants";

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

type UserPortfolioProps = {
  realmId: RealmId;
};

export default function ProfilePortfolioUser({ realmId }: UserPortfolioProps) {
  const { toast } = useToast();
  const { getToken, userId } = useAuth();

  const address = addressFromRealmId(realmId);
  const { data: user } = useSuspenseQuery(profileOptions(realmId));

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const loggedUserAddress = addressFromRealmId(userInfo?.realmId);
  const isOwner = loggedUserAddress === address;

  const profile = deserializeWithFrontMatter({
    serialized: user?.bio ?? "",
    schema: gnoProfileDetailsSchema,
    defaultValue: {
      bio: "",
      socialMediaLinks: [],
      location: "",
      shortBio: "",
      bannerUri: "",
      experiences: [],
      skills: [],
      portfolio: [],
    },
    contentFieldName: "bio",
  });

  const { portfolio, ..._otherDetails } = profile;

  const [localPortfolio, setLocalPortfolio] =
    useState<PortfolioItem[]>(portfolio);

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [previewDialogState, setPreviewDialogState] = useState<{
    isOpen: boolean;
    item: PortfolioItem;
  }>({ isOpen: false, item: {} as never });

  const t = useTranslations("community-portfolio");
  const { editUser } = useEditUserProfile();

  const onSave = async (newPortfolio: PortfolioItem[]) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      const bio = serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
        profile.bio,
        { ...profile, portfolio: newPortfolio },
      );

      await editUser({
        realmId: address,
        token,
        avatarUri: user?.avatarUri ?? "",
        displayName: user?.displayName ?? "",
        bio,
      });

      setLocalPortfolio(newPortfolio);
      toast({ title: t("upload-file-success") });
    } catch (error) {
      captureException(error);
      toast({ title: t("error-saving"), variant: "destructive" });
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

      await onSave([newItem, ...localPortfolio]);

      toast({ title: t("upload-file-success") });
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

    await onSave([newItem, ...localPortfolio]);
  };

  const onDelete = async (item: PortfolioItem) => {
    if (!isOwner) return;

    try {
      setIsDeleting(true);
      const updated = localPortfolio.filter((p) => p.id !== item.id);
      await onSave(updated);

      toast({ title: t("delete-file-success") });
      setPreviewDialogState({ isOpen: false, item: {} as never });
    } catch (err) {
      captureException(err);
      toast({ title: t("error-file-deleting"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
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
      />

      <PortfolioUploadVideoDialog
        isOpen={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        onVideoAdded={handleVideoAdded}
      />

      <div className="flex flex-col md:flex-row gap-4 mb-8 md:items-center">
        <Heading level={2} size="lg">
          {t("recent-media-uploaded")} ({localPortfolio.length})
        </Heading>

        {isOwner && localPortfolio.length > 0 && (
          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              className="text-main bg-transparent border-none"
              disabled={isUploading}
              onClick={() => imageFileInputRef.current?.click()}
            >
              <ImageIcon className="w-5 h-5 md:!h-6 md:!w-6" />
              <span className="max-md:hidden">{t("upload-image")}</span>
            </Button>

            <Button
              variant="outline"
              className="text-main bg-transparent border-none"
              disabled={isUploading}
              onClick={() => audioFileInputRef.current?.click()}
            >
              <AudioWaveform className="w-5 h-5 md:!h-6 md:!w-6" />
              <span className="max-md:hidden">{t("upload-audio")}</span>
            </Button>

            <Button
              variant="outline"
              className="text-main bg-transparent border-none"
              disabled={isUploading}
              onClick={() => setVideoDialogOpen(true)}
            >
              <Video className="w-5 h-5 md:!h-6 md:!w-6" />
              <span className="max-md:hidden">{t("add-video")}</span>
            </Button>
          </div>
        )}
      </div>

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
        {localPortfolio.length === 0 && !isUploading && (
          <div className="flex flex-col justify-center text-muted-foreground">
            <p className="text-center">{t("no-media-uploaded")}</p>

            {isOwner && (
              <div className="flex justify-center mt-4 gap-4">
                <Button
                  variant="outline"
                  className="text-main bg-transparent border-none"
                  disabled={isUploading}
                  onClick={() => imageFileInputRef.current?.click()}
                >
                  <ImageIcon className="w-5 h-5 md:!h-6 md:!w-6" />
                </Button>

                <Button
                  variant="outline"
                  className="text-main bg-transparent border-none"
                  disabled={isUploading}
                  onClick={() => audioFileInputRef.current?.click()}
                >
                  <AudioWaveform className="w-5 h-5 md:!h-6 md:!w-6" />
                </Button>

                <Button
                  variant="outline"
                  className="text-main bg-transparent border-none"
                  disabled={isUploading}
                  onClick={() => setVideoDialogOpen(true)}
                >
                  <Video className="w-5 h-5 md:!h-6 md:!w-6" />
                </Button>
              </div>
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
            {isOwner && (
              <button
                className="absolute top-2 right-2 z-10 bg-white/70 text-red-600 rounded-full p-1 hover:bg-red-600 hover:text-white transition flex items-center justify-center"
                onClick={() => onDelete(item)}
                type="button"
              >
                <Trash2Icon className="w-4 h-4" />
              </button>
            )}

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
