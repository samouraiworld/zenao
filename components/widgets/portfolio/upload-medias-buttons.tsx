import { useTranslations } from "next-intl";
import { AudioWaveform, ImageIcon, Video } from "lucide-react";
import { Dispatch, RefObject, SetStateAction } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/shadcn/tooltip";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/tailwind";

export function UploadMediasButtons({
  imageFileInputRef,
  audioFileInputRef,
  isUploading,
  setVideoDialogOpen,
  className,
}: {
  imageFileInputRef: RefObject<HTMLInputElement | null>;
  audioFileInputRef: RefObject<HTMLInputElement | null>;
  isUploading: boolean;
  setVideoDialogOpen: Dispatch<SetStateAction<boolean>>;
  className?: string;
}) {
  const t = useTranslations("portfolio");

  return (
    <div
      className={cn("flex justify-center gap-4 h-12 items-center", className)}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="text-main bg-transparent border-none"
            disabled={isUploading}
            onClick={() => imageFileInputRef.current?.click()}
          >
            <ImageIcon className="!size-6" />
            <span className="max-sm:hidden">{t("upload-image")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("upload-image")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="text-main bg-transparent border-none"
            disabled={isUploading}
            onClick={() => audioFileInputRef.current?.click()}
          >
            <AudioWaveform className="!size-6" />
            <span className="max-sm:hidden">{t("upload-audio")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("upload-audio")}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            className="text-main bg-transparent border-none"
            disabled={isUploading}
            onClick={() => setVideoDialogOpen(true)}
          >
            <Video className="!size-6" />
            <span className="max-sm:hidden">{t("upload-video")}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>{t("upload-video")}</TooltipContent>
      </Tooltip>
    </div>
  );
}
