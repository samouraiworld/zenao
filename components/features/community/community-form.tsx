"use client";

import React from "react";
import { UseFormReturn, useFieldArray } from "react-hook-form";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldImage } from "@/components/widgets/form/form-field-image";
import { ButtonWithChildren } from "@/components/widgets/buttons/button-with-children";
import { Button } from "@/components/shadcn/button";
import { CommunityFormSchemaType } from "@/types/schemas";

interface CommunityFormProps {
  form: UseFormReturn<CommunityFormSchemaType>;
  onSubmit: (values: CommunityFormSchemaType) => Promise<void>;
  isLoading: boolean;
}

export const CommunityForm: React.FC<CommunityFormProps> = ({
  form,
  onSubmit,
  isLoading,
}) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "administrators",
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex w-full gap-10"
      >
        <div className="flex flex-col gap-6 w-1/3">
          <FormFieldImage
            name="avatarUri"
            control={form.control}
            aspectRatio={1.5}
            placeholder="Upload avatar image"
            className="w-full"
          />
          <FormFieldImage
            name="bannerUri"
            control={form.control}
            aspectRatio={1.5}
            placeholder="Upload banner image"
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-6 w-2/3">
          <FormFieldInputString
            control={form.control}
            name="displayName"
            label="Community name"
            placeholder="Community name..."
          />
          <FormFieldTextArea
            control={form.control}
            name="description"
            label="Description"
            placeholder="Description..."
            wordCounter
            maxLength={5000}
          />

          <div className="flex flex-col gap-4">
            <label className="block text-sm font-medium">Administrators</label>
            <div className="flex flex-col gap-2">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-center">
                  <FormFieldInputString
                    control={form.control}
                    name={`administrators.${index}.address`}
                    placeholder="New administrator email"
                    className="flex-grow"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => remove(index)}
                    aria-label={`Remove administrator ${index + 1}`}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              <ButtonWithChildren
                type="button"
                variant="outline"
                onClick={() => append({ address: "" })}
                className="w-fit"
              >
                Add Administrator
              </ButtonWithChildren>
            </div>
          </div>

          <ButtonWithChildren loading={isLoading} type="submit">
            Update Community
          </ButtonWithChildren>
        </div>
      </form>
    </Form>
  );
};
