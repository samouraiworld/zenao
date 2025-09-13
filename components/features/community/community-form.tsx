"use client";

import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { cn } from "@/lib/tailwind";
import { CommunityFormSchemaType } from "@/types/schemas";

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
  const { fields, append, remove } = useFieldArray<CommunityFormSchemaType>({
    control: form.control,
    name: "administrators", // TODO: fix
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full flex-col gap-10"
      >
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Administrators
          </label>
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 mb-2 items-center">
              <input
                type="text"
                {...form.register(`administrators.${index}`)}
                className={cn(
                  "input input-bordered flex-grow",
                  "rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
                )}
                placeholder="Administrator address"
              />
              <button
                type="button"
                onClick={() => remove(index)}
                className="btn btn-error btn-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <ButtonWithChildren
            type="button"
            onClick={() => append("")} // TODO: fix
            className="btn btn-primary btn-sm"
          >
            Add Administrator
          </ButtonWithChildren>
        </div>

        <ButtonWithChildren loading={isLoading} type="submit">
          Update Community
        </ButtonWithChildren>
      </form>
    </Form>
  );
};
