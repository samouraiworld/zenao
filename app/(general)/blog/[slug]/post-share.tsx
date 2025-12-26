"use client";

import { Share } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/shadcn/button";
import { useToast } from "@/hooks/use-toast";
import { captureException } from "@/lib/report";

interface PostShareProps {
  slug: string;
  title: string;
}

export default function PostShare({ slug, title }: PostShareProps) {
  const { toast } = useToast();
  const t = useTranslations("blog-post");

  const handleShare = () => {
    if (typeof window === "undefined") return;

    const shareUrl = `${window.location.origin}/blog/${slug}`;

    // Use the Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: title,
          url: shareUrl,
        })
        .catch((error) => {
          if (error instanceof Error && error.name !== "AbortError") {
            captureException(error);
            console.log("Error sharing:", error);
          }
        });
    } else {
      // Fallback to clipboard copy if not supported
      navigator.clipboard
        .writeText(`${title} - ${shareUrl}`)
        .then(() => {
          toast({
            title: t("link-copied-toast"),
            variant: "default",
          });
        })
        .catch((error) => {
          if (error instanceof Error) {
            captureException(error);
            toast({
              variant: "destructive",
              title: t("failed-to-copy-link-toast"),
            });
          }
        });
    }
  };

  return (
    <Button variant="outline" onClick={handleShare}>
      <Share className="w-5 h-5" />
      <span className="sr-only">Share Post</span>
    </Button>
  );
}
