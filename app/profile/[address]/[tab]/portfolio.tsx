"use client";

import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AudioWaveform, ImageIcon, Loader2, Video } from "lucide-react";
import { memo, useRef, useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { useAuth } from "@clerk/nextjs";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { profileOptions } from "@/lib/queries/profile";
import { userInfoOptions } from "@/lib/queries/user";
import {
  deserializeWithFrontMatter,
  //   serializeWithFrontMatter,
} from "@/lib/serialization";
import {
  //   GnoProfileDetails,
  PortfolioItem,
  PortfolioUploadVideoSchemaType,
  gnoProfileDetailsSchema,
} from "@/types/schemas";
import { Button } from "@/components/shadcn/button";
import { useToast } from "@/hooks/use-toast";
import { uploadFile } from "@/lib/files";
// import { useEditUserProfile } from "@/lib/mutations/profile";
import { captureException } from "@/lib/report";
import PortfolioPreviewDialog from "@/components/dialogs/portfolio-preview-dialog";
import {
  AUDIO_FILE_SIZE_LIMIT,
  AUDIO_FILE_SIZE_LIMIT_MB,
  IMAGE_FILE_SIZE_LIMIT,
  IMAGE_FILE_SIZE_LIMIT_MB,
} from "@/app/event/[id]/constants";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import { cn } from "@/lib/tailwind";
import { addressFromRealmId } from "@/lib/gno";
import PortfolioUploadVideoDialog from "@/components/dialogs/portfolio-upload-video-dialog";

type UserPortfolioProps = {
  address: string;
};

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

export default function ProfilePortfolioUser({ address }: UserPortfolioProps) {
  const { toast } = useToast();
  const { getToken, userId } = useAuth();

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  const realmId = userInfo?.realmId || "";
  const { data: user } = useSuspenseQuery(profileOptions(realmId));

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

  const isOwner = userId && addressFromRealmId(realmId) === address;

  const { portfolio, ...otherDetails } = profile;

  const [localPortfolio, setLocalPortfolio] =
    useState<PortfolioItem[]>(portfolio);

  //   const { editUser } = useEditUserProfile();

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [previewDialogState, setPreviewDialogState] = useState<{
    isOpen: boolean;
    item: PortfolioItem;
  }>({ isOpen: false, item: {} as never });

  const t = useTranslations("community-portfolio"); // TODO: same portfolio translations for profile&community

  const onSave = async (newPortfolio: PortfolioItem[]) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      //   const bio = serializeWithFrontMatter<Omit<GnoProfileDetails, "bio">>(
      //     otherDetails.bio,
      //     {
      //       socialMediaLinks: otherDetails.socialMediaLinks,
      //       location: otherDetails.location,
      //       shortBio: otherDetails.shortBio,
      //       bannerUri: otherDetails.bannerUri,
      //       experiences: otherDetails.experiences,
      //       skills: otherDetails.skills,
      //       portfolio: newPortfolio,
      //     },
      //   );

      //   await editUser({
      //   });

      setLocalPortfolio(newPortfolio);
    } catch (err) {
      captureException(err);
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

      toast({ title: t("upload-success") });
    } catch (error) {
      captureException(error);

      if (error.message?.includes("File size exceeds limit")) {
        toast({
          variant: "destructive",
          title: t("error-size", {
            size:
              fileType === "image"
                ? IMAGE_FILE_SIZE_LIMIT_MB
                : AUDIO_FILE_SIZE_LIMIT_MB,
          }),
        });
      } else {
        toast({ title: t("error-upload"), variant: "destructive" });
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

      toast({ title: t("delete-success") });
      setPreviewDialogState({ isOpen: false, item: {} as never });
    } catch (err) {
      captureException(err);
      toast({ title: t("error-delete"), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      <PortfolioPreviewDialog
        isOpen={previewDialogState.isOpen}
        onOpenChange={(open) =>
          setPreviewDialogState(() => ({ isOpen: open, item: {} as never }))
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

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <Heading level={3}>
          {t("recent-media-uploaded")} ({localPortfolio.length})
        </Heading>

        {isOwner && (
          <div className="flex gap-4 items-center">
            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => imageFileInputRef.current?.click()}
            >
              <ImageIcon className="w-5 h-5" />
              <span className="max-md:hidden">{t("upload-image")}</span>
            </Button>

            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => audioFileInputRef.current?.click()}
            >
              <AudioWaveform className="w-5 h-5" />
              <span className="max-md:hidden">{t("upload-audio")}</span>
            </Button>

            <Button
              variant="outline"
              disabled={isUploading}
              onClick={() => setVideoDialogOpen(true)}
            >
              <Video className="w-5 h-5" />
              <span className="max-md:hidden">{t("add-video")}</span>
            </Button>
          </div>
        )}
      </div>

      <input
        ref={imageFileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onUpload("image", e)}
      />

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
        {isUploading && (
          <div className="max-w-[350px] w-full">
            <AspectRatio ratio={16 / 9}>
              <div className="h-full flex justify-center items-center border rounded">
                <Loader2 className="animate-spin" />
              </div>
            </AspectRatio>
          </div>
        )}

        {localPortfolio.map((item) => (
          <div
            key={item.id}
            className={cn(
              "w-full max-w-full",
              localPortfolio.length < 2 && "max-w-[400px]",
            )}
            onClick={() => setPreviewDialogState({ isOpen: true, item })}
          >
            {item.type === "image" && (
              <AspectRatio ratio={16 / 9}>
                <Web3Image
                  src={item.uri}
                  alt={item.name}
                  fill
                  className="object-cover cursor-pointer rounded"
                />
              </AspectRatio>
            )}

            {item.type === "audio" && (
              <AspectRatio ratio={16 / 9}>
                <div className="h-full flex items-center justify-center bg-muted rounded cursor-pointer">
                  <AudioWaveform className="w-16 h-16 text-main" />
                </div>
              </AspectRatio>
            )}

            {item.type === "video" && (
              <AspectRatio ratio={16 / 9}>
                <MemoizedVideoPreview uri={item.uri} />
              </AspectRatio>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
