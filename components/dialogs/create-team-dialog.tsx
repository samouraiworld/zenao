"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import { Input } from "../shadcn/input";
import { Label } from "../shadcn/label";
import { ButtonWithChildren } from "../widgets/buttons/button-with-children";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useCreateTeam } from "@/lib/mutations/team-create";
import { useActiveAccount } from "@/components/providers/active-account-provider";
import { useToast } from "@/hooks/use-toast";

type CreateTeamDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
};

export function CreateTeamDialog({
  open,
  onOpenChange,
  userId,
}: CreateTeamDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const t = useTranslations("dashboard.createTeam");
  const { getToken } = useAuth();
  const { createTeam, isPending } = useCreateTeam();
  const { switchAccount } = useActiveAccount();
  const { toast } = useToast();

  const [teamName, setTeamName] = useState("");

  const handleCreate = async () => {
    if (!teamName.trim()) return;

    const token = await getToken();
    if (!token) return;

    try {
      const teamId = await createTeam({
        token,
        userId,
        displayName: teamName.trim(),
      });

      toast({
        title: t("success"),
      });

      setTeamName("");
      onOpenChange(false);

      switchAccount({
        type: "team",
        id: teamId,
      });
    } catch {
      toast({
        title: t("error"),
        variant: "destructive",
      });
    }
  };

  const content = (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="team-name">{t("name-label")}</Label>
          <Input
            id="team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={t("name-placeholder")}
            disabled={isPending}
          />
        </div>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
    </>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          {content}
          <DialogFooter>
            <ButtonWithChildren
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </ButtonWithChildren>
            <ButtonWithChildren
              onClick={handleCreate}
              loading={isPending}
              disabled={!teamName.trim()}
            >
              {t("create")}
            </ButtonWithChildren>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-6">
        <DrawerHeader className="text-left">
          <DrawerTitle>{t("title")}</DrawerTitle>
          <DrawerDescription>{t("subtitle")}</DrawerDescription>
        </DrawerHeader>
        <div className="px-4">{content}</div>
        <DrawerFooter className="pt-2">
          <ButtonWithChildren
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            {t("cancel")}
          </ButtonWithChildren>
          <ButtonWithChildren
            onClick={handleCreate}
            loading={isPending}
            disabled={!teamName.trim()}
          >
            {t("create")}
          </ButtonWithChildren>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
