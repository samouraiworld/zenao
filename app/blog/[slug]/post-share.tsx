"use client";

import { Share } from "lucide-react";
import { Button } from "@/components/shadcn/button";
import { useToast } from "@/hooks/use-toast";

interface PostShareProps {
  slug: string;
  title: string;
}

export default function PostShare({ slug, title }: PostShareProps) {
  const { toast } = useToast();
  const shareUrl = `${window.location.origin}/blog/${slug}`;

  const handleShare = () => {
    // Use the Web Share API if available
    if (navigator.share) {
      navigator
        .share({
          title: title,
          url: shareUrl,
        })
        .catch((error) => {
          if (error instanceof Error) {
            console.log("Error sharing:", error.message);
          }
        });
    } else {
      // Fallback to clipboard copy if not supported
      navigator.clipboard
        .writeText(`${title} - ${shareUrl}`)
        .then(() => {
          toast({
            title: "Link copied to clipboard",
            variant: "default",
          });
        })
        .catch((error) => {
          if (error instanceof Error) {
            console.error("Error copying to clipboard:", error.message);
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
