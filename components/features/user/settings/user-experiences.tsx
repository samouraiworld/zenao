import { useFieldArray, UseFormReturn, useWatch } from "react-hook-form";
import React from "react";
import { UserFormSchemaType } from "@/types/schemas";
import Heading from "@/components/widgets/texts/heading";
import { Button } from "@/components/shadcn/button";
import ExperienceDialog from "@/components/dialogs/experience-dialog";

interface UserExperiencesProps {
  form: UseFormReturn<UserFormSchemaType>;
}

export default function UserExperiences({ form }: UserExperiencesProps) {
  const [experienceDialogState, setExperienceDialogState] = React.useState<{
    open: boolean;
    experienceIndexToEdit: number | null;
  }>({ open: false, experienceIndexToEdit: null });

  const {
    append: appendExperience,
    remove: removeExperience,
    update: updateExperience,
    fields: experienceFields,
  } = useFieldArray({
    control: form.control,
    name: "experiences",
  });

  const experiences = useWatch({
    control: form.control,
    name: "experiences",
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      <ExperienceDialog
        open={experienceDialogState.open}
        onOpenChange={(open) => {
          setExperienceDialogState((prev) => ({ ...prev, open }));
        }}
        experience={
          experienceDialogState.experienceIndexToEdit !== null
            ? experiences[experienceDialogState.experienceIndexToEdit]
            : undefined
        }
        onEdit={(experience) => {
          if (experienceDialogState.experienceIndexToEdit === null) return;
          updateExperience(
            experienceDialogState.experienceIndexToEdit,
            experience,
          );
          setExperienceDialogState({
            open: false,
            experienceIndexToEdit: null,
          });
        }}
        onAdd={(experience) => {
          appendExperience(experience);
          setExperienceDialogState({
            open: false,
            experienceIndexToEdit: null,
          });
        }}
      />

      <Heading level={3}>Experiences</Heading>

      <Button
        type="button"
        className="w-fit"
        onClick={() =>
          setExperienceDialogState({
            open: true,
            experienceIndexToEdit: null,
          })
        }
      >
        Add experience
      </Button>
    </div>
  );
}
