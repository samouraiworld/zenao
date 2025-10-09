"use client";

import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import { useAuth } from "@clerk/nextjs";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { communityInfo, communityUserRoles } from "@/lib/queries/community";
import {
  deserializeWithFrontMatter,
  serializeWithFrontMatter,
} from "@/lib/serialization";
import {
  CommunityDetails,
  communityDetailsSchema,
  PortfolioItem,
} from "@/types/schemas";
import { Button } from "@/components/shadcn/button";
import { useToast } from "@/hooks/use-toast";
import { web2URL } from "@/lib/uris";
import { cn } from "@/lib/tailwind";
import { uploadFile } from "@/lib/files";
import { useEditCommunity } from "@/lib/mutations/community-edit";
import { captureException } from "@/lib/report";
import { zenaoClient } from "@/lib/zenao-client";
import PortfolioPreviewDialog from "@/components/dialogs/portfolio-preview-dialog";
import { userAddressOptions } from "@/lib/queries/user";

type CommunityPortfolioProps = {
  communityId: string;
};

export default function CommunityPortfolio({
  communityId,
}: CommunityPortfolioProps) {
  const { toast } = useToast();
  const { getToken, userId } = useAuth();
  const { data: userAddress } = useSuspenseQuery(
    userAddressOptions(getToken, userId),
  );
  const { data: userRoles = [] } = useSuspenseQuery(
    communityUserRoles(communityId, userAddress),
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewDialogState, setPreviewDialogState] = useState<{
    isOpen: boolean;
    item: PortfolioItem;
  }>({
    isOpen: false,
    item: {} as never,
  });

  const { data: community } = useSuspenseQuery(communityInfo(communityId));
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

  // const t = useTranslations("");

  const { portfolio, ...otherDetails } = deserializeWithFrontMatter({
    contentFieldName: "description",
    schema: communityDetailsSchema,
    serialized: community?.description ?? "",
    defaultValue: {
      description: "",
      shortDescription: "",
      portfolio: [],
    },
  });
  const { mutateAsync: editCommunity } = useEditCommunity();

  const [localPortfolio, setLocalPortfolio] =
    useState<PortfolioItem[]>(portfolio);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error("invalid clerk token");

      setIsUploading(true);

      const uri = await uploadFile(files[0]);
      const newItem: PortfolioItem = {
        name: files[0].name,
        uri,
        uploadedAt: new Date(),
        id: crypto.randomUUID(),
      };

      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(otherDetails.description, {
        shortDescription: otherDetails.shortDescription,
        portfolio: [newItem, ...localPortfolio],
      });

      await editCommunity({
        ...community,
        communityId,
        administrators,
        token,
        description,
      });
      setLocalPortfolio((prev) => [newItem, ...prev]);

      toast({
        title: "File uploaded successfully",
      });
    } catch (error) {
      captureException(error);
      console.error("Upload failed", error);
      toast({
        title: "Error while uploading file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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

      const description = serializeWithFrontMatter<
        Omit<CommunityDetails, "description">
      >(otherDetails.description, {
        shortDescription: otherDetails.shortDescription,
        portfolio: updatedPortfolio,
      });

      await editCommunity({
        ...community,
        communityId,
        administrators,
        token,
        description,
      });
      setLocalPortfolio(updatedPortfolio);
      toast({
        title: "Item deleted successfully",
      });
      setPreviewDialogState({ isOpen: false, item: {} as never });
    } catch (error) {
      captureException(error);
      console.error("Delete failed", error);
      toast({
        title: "Error while deleting item",
        variant: "destructive",
      });
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
        isAdmin={isAdmin}
      />

      <div className="flex items-center">
        <Heading level={3}>
          Recent media uploaded ({localPortfolio.length})
        </Heading>
        {isAdmin && localPortfolio.length > 0 && (
          <Button
            variant="link"
            className="text-main"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload file
            <Upload />
          </Button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(e) => onUpload(e)}
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
            <p className="text-center">No media uploaded yet.</p>
            {isAdmin && (
              <Button
                variant="link"
                className="text-main"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload your first file
                <Upload />
              </Button>
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

        {localPortfolio.length > 0 && (
          <div className="absolute top-0 right-0"></div>
        )}

        {localPortfolio.map((item, index) => (
          <div className="w-full" key={index}>
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
          </div>
        ))}
      </div>
    </div>
  );
}
