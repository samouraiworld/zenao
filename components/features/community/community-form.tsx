import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";

// TODO: move to @/types/schemas
const communityFormSchema = z.object({
  displayName: z.string().min(3, "Name too short"),
  description: z.string().min(5, "Description too short"),
  avatarUri: z.string().url().or(z.literal("")),
  bannerUri: z.string().url().or(z.literal("")),
  administrators: z
    .array(z.string().min(1))
    .min(1, "At least one admin is required"),
});

type CommunityFormSchemaType = z.infer<typeof communityFormSchema>;

interface CommunityFormProps {
  form: UseFormReturn<CommunityFormSchemaType>;
  onSubmit: (values: CommunityFormSchemaType) => Promise<void>;
  isLoading: boolean;
  isEditing?: boolean;
}

export const CommunityForm: React.FC<CommunityFormProps> = ({
  form,
  onSubmit,
  isLoading,
  isEditing = false,
}) => {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8 max-w-2xl mx-auto w-full"
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <FormFieldImage
              name="avatarUri"
              control={form.control}
              aspectRatio={1}
              placeholder="Upload avatar image"
            />
            <FormFieldImage
              name="bannerUri"
              control={form.control}
              aspectRatio={3.5}
              placeholder="Upload banner image"
            />
          </div>
          <FormFieldInputString
            control={form.control}
            name="displayName"
            label="Name"
            placeholder="Enter community name"
          />
          <FormFieldTextArea
            control={form.control}
            name="description"
            label="Description"
            placeholder="Write a short description..."
            wordCounter
            maxLength={5000}
          />
          {/* TODO: admin */}
        </div>

        <ButtonWithChildren loading={isLoading} type="submit">
          {isEditing ? "Update Community" : "Create Community"}
        </ButtonWithChildren>
      </form>
    </Form>
  );
};
