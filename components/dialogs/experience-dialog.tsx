import { useForm } from "react-hook-form";
import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../shadcn/dialog";
import { useMediaQuery } from "@/hooks/use-media-query";
import { UserExperienceSchemaType } from "@/types/schemas";

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
          </DialogHeader>

          {/* <ExperienceForm
            experience={experience}
            onSubmit={(data) => {
              if (experience) {
                onEdit(data);
              } else {
                onAdd(data);
              }
            }}
          /> */}
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
