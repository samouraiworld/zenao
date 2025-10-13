import { UseFormReturn } from "react-hook-form";
import { useEffect } from "react";
import { FormFieldInputString } from "@/components/widgets/form/form-field-input-string";
import { UserExperienceSchemaType } from "@/types/schemas";
import { Form, FormField } from "@/components/shadcn/form";
import { FormFieldTextArea } from "@/components/widgets/form/form-field-textarea";
import { FormFieldCheckbox } from "@/components/widgets/form/form-field-checkbox";
import Text from "@/components/widgets/texts/text";
import FormFieldYearSelector from "@/components/widgets/form/form-field-year-selector";
import FormFieldMonthSelector from "@/components/widgets/form/form-field-month-selector";
import { Button } from "@/components/shadcn/button";
import { cn } from "@/lib/tailwind";

interface ExperienceFormProps {
  form: UseFormReturn<UserExperienceSchemaType>;
  experience?: UserExperienceSchemaType;
  onSubmit: (data: UserExperienceSchemaType) => void;
}

export default function ExperienceForm({
  form,
  experience,
  onSubmit,
}: ExperienceFormProps) {
  const isOnGoing = form.watch("current");
  const { errors } = form.formState;

  useEffect(() => {
    if (isOnGoing) {
      form.setValue("end", undefined);
    }
  }, [isOnGoing, form]);

  return (
    <Form {...form}>
      <form className="w-full">
        <div className="w-full grid grid-cols-1 lg:grid-col-3 gap-4">
          <FormFieldInputString
            control={form.control}
            label="Title"
            name="title"
            placeholder="e.g. Software Engineer"
            className="col-span-1 lg:col-span-3"
          />
          <div className="col-span-1 lg:col-span-3">
            <FormFieldTextArea
              control={form.control}
              name="description"
              placeholder="Tell us about your experience"
              label="Description"
              wordCounter
              maxLength={1000}
            />
          </div>
          <div className="flex flex-col col-span-1 lg:col-span-3 gap-4">
            <div className="flex flex-col gap-2">
              <Text className="font-medium text-sm">Start date</Text>
              <FormField
                control={form.control}
                name="start"
                render={(_) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-start items-start gap-2">
                      <FormFieldMonthSelector
                        control={form.control}
                        name="start.month"
                      />
                      <FormFieldYearSelector
                        control={form.control}
                        name="start.year"
                      />
                    </div>
                    {errors.start?.root && (
                      <p className={cn("text-sm font-medium text-destructive")}>
                        {errors.start.root.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
            <FormFieldCheckbox
              control={form.control}
              name="current"
              label="Still on-going"
            />

            <div className="flex flex-col gap-2">
              <Text className="font-medium text-sm">End date</Text>
              <FormField
                control={form.control}
                name="end"
                render={(_) => (
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-start items-start gap-2">
                      <FormFieldMonthSelector
                        control={form.control}
                        name="end.month"
                        disabled={isOnGoing}
                      />
                      <FormFieldYearSelector
                        control={form.control}
                        name="end.year"
                        disabled={isOnGoing}
                      />
                    </div>
                    {errors.end?.root && (
                      <p className={cn("text-sm font-medium text-destructive")}>
                        {errors.end.root.message}
                      </p>
                    )}
                  </div>
                )}
              />
            </div>
          </div>
          <FormFieldInputString
            control={form.control}
            label="Organization (optional)"
            name="organization"
            placeholder="e.g. Google"
            className="col-span-1 lg:col-span-3"
          />
          <div className="col-span-1 lg:col-span-3 mt-6">
            <Button
              type="button"
              className="w-full"
              onClick={form.handleSubmit(onSubmit)}
            >
              {experience ? "Done" : "Add experience"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
