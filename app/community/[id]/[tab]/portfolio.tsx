"use client";

import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { AspectRatio } from "@radix-ui/react-aspect-ratio";
import Heading from "@/components/widgets/texts/heading";
import { Web3Image } from "@/components/widgets/images/web3-image";
import { communityInfo } from "@/lib/queries/community";
import { deserializeWithFrontMatter } from "@/lib/serialization";
import { communityDetailsSchema, PortfolioItem } from "@/types/schemas";
import { Button } from "@/components/shadcn/button";
import { useToast } from "@/hooks/use-toast";
import { web2URL } from "@/lib/uris";
import { cn } from "@/lib/tailwind";

type CommunityPortfolioProps = {
  communityId: string;
};

export default function CommunityPortfolio({
  communityId,
}: CommunityPortfolioProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: community } = useSuspenseQuery(communityInfo(communityId));
  // const t = useTranslations("");

  const { portfolio } = deserializeWithFrontMatter({
    contentFieldName: "description",
    schema: communityDetailsSchema,
    serialized: community?.description ?? "",
    defaultValue: {
      description: "",
      shortDescription: "",
      portfolio: [],
    },
  });

  const [localPortfolio, setLocalPortfolio] = useState<PortfolioItem[]>([
    {
      name: "Sample Media 1",
      uri: "ipfs://bafkreib3jepmhoh2szfq4m2xsixwwucv4uwtvkkq2zotuqamvvn3i2vmhm",
      uploadedAt: new Date(),
    },
  ]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      return;
    }

    try {
      setIsUploading(true);

      // Simulate upload process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast({
        title: "File uploaded successfully",
      });
    } catch (error) {
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

  return (
    <div className="space-y-8 relative">
      <div className="flex items-center">
        <Heading>Recent media uploaded ({localPortfolio.length})</Heading>
        {localPortfolio.length > 0 && (
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
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          maxWidth: "100%",
        }}
      >
        {localPortfolio.length === 0 && !isUploading && (
          <div className="flex flex-col justify-center text-muted-foreground">
            <p className="text-center">No media uploaded yet.</p>
            <Button
              variant="link"
              className="text-main"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload your first file
              <Upload />
            </Button>
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
          <div className="max-w-[350px] w-full" key={index}>
            <AspectRatio ratio={16 / 9}>
              <div className="h-full border rounded border-muted overflow-hidden">
                <Web3Image
                  src={web2URL(
                    "ipfs://bafkreib3jepmhoh2szfq4m2xsixwwucv4uwtvkkq2zotuqamvvn3i2vmhm",
                  )}
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
                  src={web2URL(
                    "ipfs://bafkreib3jepmhoh2szfq4m2xsixwwucv4uwtvkkq2zotuqamvvn3i2vmhm",
                  )}
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
