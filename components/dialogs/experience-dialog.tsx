"use client";

import { useForm } from "react-hook-form";
import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "../shadcn/drawer";
import ExperienceForm from "../features/user/settings/experience-form";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
  userExperienceSchema,
  UserExperienceSchemaType,
} from "@/types/schemas";

interface ExperienceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  experience?: UserExperienceSchemaType;
  onEdit: (experience: UserExperienceSchemaType) => void;
  onAdd: (experience: UserExperienceSchemaType) => void;
}

export default function ExperienceDialog({
  open,
  onOpenChange,
  experience,
  onEdit,
  onAdd,
}: ExperienceDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const form = useForm<UserExperienceSchemaType>({
    mode: "all",
    resolver: zodResolver(userExperienceSchema),
    defaultValues: experience || {
      title: "",
      description: "",
      start: { month: 1, year: 2024 },
      end: undefined,
      current: false,
      organization: "",
    },
  });

  useEffect(() => {
    if (experience) {
      form.reset(experience);
    } else {
      form.reset({
        title: "",
        description: "",
        start: { month: 1, year: 2024 },
        end: undefined,
        current: false,
        organization: "",
      });
    }
  }, [experience, form]);

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  if (!open) return null;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="md:max-w-2xl lg:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {experience ? "Edit Experience" : "Add Experience"}
            </DialogTitle>
            <DialogDescription className="hidden">
              {experience ? "Edit Experience" : "Add Experience"}
            </DialogDescription>
          </DialogHeader>

          <ExperienceForm
            form={form}
            experience={experience}
            onSubmit={(data) => {
              if (experience) {
                onEdit(data);
              } else {
                onAdd(data);
              }
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-6">
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {experience ? "Edit Experience" : "Add Experience"}
          </DrawerTitle>
          <DrawerDescription className="hidden">
            {experience ? "Edit Experience" : "Add Experience"}
          </DrawerDescription>
        </DrawerHeader>
      </DrawerContent>
    </Drawer>
  );
}
