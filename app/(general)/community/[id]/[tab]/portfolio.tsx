"use client";

import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AudioWaveform, Loader2 } from "lucide-react";
import { memo, useRef, useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { useAuth } from "@clerk/nextjs";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import {
  communityInfo as communityInfoQuery,
  communityUserRoles,
} from "@/lib/queries/community";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import {
  CommunityDetails,
  communityDetailsSchema,
  PortfolioItem,
  PortfolioUploadVideoSchemaType,
} from "@/types/schemas";
import { useToast } from "@/hooks/use-toast";
import { web2URL } from "@/lib/uris";
import { cn } from "@/lib/tailwind";
import { uploadFile } from "@/lib/files";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";
import { zenaoClient } from "@/lib/zenao-client";
import PortfolioPreviewDialog from "@/components/dialogs/portfolio-preview-dialog";
import { userInfoOptions } from "@/lib/queries/user";
import PortfolioUploadVideoDialog from "@/components/dialogs/portfolio-upload-video-dialog";
import { MarkdownPreview } from "@/components/widgets/markdown-preview";
import {
  AUDIO_FILE_SIZE_LIMIT,
  AUDIO_FILE_SIZE_LIMIT_MB,
  IMAGE_FILE_SIZE_LIMIT,
  IMAGE_FILE_SIZE_LIMIT_MB,
} from "@/components/features/event/constants";
import { useAnalyticsEvents } from "@/hooks/use-analytics-events";
import EmptyList from "@/components/widgets/lists/empty-list";
import { UploadMediasButtons } from "@/components/widgets/portfolio/upload-medias-buttons";

type CommunityPortfolioProps = {
  communityId: string;
};

const MemoizedVideoPreview = memo(({ uri }: { uri: string }) => (
  <MarkdownPreview
    className="w-full pointer-events-none"
    markdownString={uri}
  />
));
MemoizedVideoPreview.displayName = "MemoizedVideoPreview";

export default function CommunityPortfolio({
  communityId,
}: CommunityPortfolioProps) {
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { trackEvent } = useAnalyticsEvents();
  const { data: userAddress } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress?.realmId),
  );

  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [previewDialogState, setPreviewDialogState] = useState<{
    isOpen: boolean;
    item: PortfolioItem;
  }>({
    isOpen: false,
    item: {} as never,
  });

  const { data: communityInfo } = useSuspenseQuery(
    communityInfoQuery(communityId),
  );
  const { data: administrators } = useSuspenseQuery({
    queryKey: ["communityAdmins", communityId],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");
      const res = await zenaoClient.getCommunityAdministrators(
        { communityId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return res.administrators;
    },
    initialData: [],
  });

  const isAdmin = userRoles.includes("administrator");

  const t = useTranslations("portfolio");

  const { portfolio, ...otherDetails } = deserializeWithFrontMatter({
    contentFieldName: "description",
    schema: communityDetailsSchema,
    serialized: communityInfo?.description ?? "",
    defaultValue: {
      description: "",
      shortDescription: "",
      portfolio: [],
      socialMediaLinks: [],
    },
  });

  const { mutateAsync: editCommunity } = useEditCommunity();

  const [localPortfolio, setLocalPortfolio] =
    useState<PortfolioItem[]>(portfolio);

  const onSave = async (
    newPortfolio: PortfolioItem[],
    itemType: "image" | "audio" | "video",
  ) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(otherDetails.description, {
        shortDescription: otherDetails.shortDescription,
        portfolio: newPortfolio,
        socialMediaLinks: otherDetails.socialMediaLinks,
      });

      await editCommunity({
        ...communityInfo,
        communityId,
        administrators,
        token,
        description,
      });
      setLocalPortfolio(newPortfolio);

      trackEvent("PortfolioUpdated", {
        props: {
          orgType: "community",
          orgId: communityId,
          itemType,
        },
      });
    } catch (error) {
      captureException(error);
      console.error("Save portfolio failed", error);
      toast({
        title: t("error-saving-portfolio"),
        variant: "destructive",
      });
    }
  };

  const onUpload = async (
    fileType: "image" | "audio",
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || !files.length) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      setIsUploading(true);

      const uri = await uploadFile(
        files[0],
        fileType === "image" ? IMAGE_FILE_SIZE_LIMIT : AUDIO_FILE_SIZE_LIMIT,
      );
      const newItem: PortfolioItem = {
        type: fileType,
        name: files[0].name,
        uri,
        uploadedAt: new Date(),
        id: crypto.randomUUID(),
      };

      const newPortfolio = [newItem, ...localPortfolio];
      await onSave(newPortfolio, fileType);

      toast({
        title: t("upload-file-success"),
      });
    } catch (error) {
      captureException(error);
      console.error("Upload failed", error);

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
        toast({
          title: t("error-file-uploading"),
          variant: "destructive",
        });
      }
    } finally {
      setIsUploading(false);
      if (imageFileInputRef.current) {
        imageFileInputRef.current.value = "";
      }

      if (audioFileInputRef.current) {
        audioFileInputRef.current.value = "";
      }
    }
  };

  const handleVideoAdded = async (data: PortfolioUploadVideoSchemaType) => {
    const newItem: PortfolioItem = {
      type: "video",
      name: data.uri,
      uri: data.uri,
      uploadedAt: new Date(),
      id: crypto.randomUUID(),
    };

    const newPortfolio = [newItem, ...localPortfolio];
    await onSave(newPortfolio, "video");
  };

  const onPreview = (item: PortfolioItem) => {
    setPreviewDialogState({ isOpen: true, item });
  };

  const onDelete = async (item: PortfolioItem) => {
    if (!isAdmin) return;

    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      setIsDeleting(true);
      const updatedPortfolio = localPortfolio.filter((p) => p.id !== item.id);
      await onSave(updatedPortfolio, item.type);

      toast({
        title: t("delete-file-success"),
      });
      setPreviewDialogState({ isOpen: false, item: {} as never });
    } catch (error) {
      captureException(error);
      console.error("Delete failed", error);
      toast({
        title: t("error-file-deleting"),
        variant: "destructive",
      });
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
        isAdmin={isAdmin}
      />

      <PortfolioUploadVideoDialog
        isOpen={videoDialogOpen}
        onOpenChange={setVideoDialogOpen}
        onVideoAdded={handleVideoAdded}
      />

      {isAdmin && !!localPortfolio.length && (
        <UploadMediasButtons
          imageFileInputRef={imageFileInputRef}
          audioFileInputRef={audioFileInputRef}
          isUploading={isUploading}
          setVideoDialogOpen={setVideoDialogOpen}
          className="mb-2"
        />
      )}

      {!!localPortfolio.length && (
        <Heading level={2} size="lg" className="mt-2">
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
              description={isAdmin ? t("no-media-description") : undefined}
            />

            {isAdmin && (
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
              "w-full max-w-full",
              localPortfolio.length < 2 && "max-w-[400px]",
            )}
            key={item.id}
          >
            {item.type === "image" && (
              <AspectRatio ratio={16 / 9} onClick={() => onPreview(item)}>
                <div className="h-full border rounded border-muted overflow-hidden">
                  <Web3Image
                    src={web2URL(item.uri)}
                    alt={`${item.name}-bg`}
                    fill
                    sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                    className={cn(
                      "flex object-cover rounded self-center cursor-pointer blur overflow-hidden brightness-[75%]",
                      "hover:brightness-[60%] transition-all",
                    )}
                  />
                  <Web3Image
                    src={web2URL(item.uri)}
                    alt={item.name}
                    fill
                    sizes="(max-width: 768px) 100vw,
                      (max-width: 1200px) 70vw,
                      33vw"
                    className={cn(
                      "flex object-contain rounded self-center cursor-pointer",
                      "hover:brightness-[60%] transition-all",
                    )}
                  />
                </div>
              </AspectRatio>
            )}
            {item.type === "audio" && (
              <AspectRatio ratio={16 / 9} onClick={() => onPreview(item)}>
                <div className="h-full border rounded border-muted overflow-hidden flex items-center justify-center bg-muted cursor-pointer hover:brightness-90 transition">
                  <AudioWaveform className="w-16 h-16 text-main" />
                </div>
              </AspectRatio>
            )}
            {item.type === "video" && (
              <AspectRatio ratio={16 / 9} onClick={() => onPreview(item)}>
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
