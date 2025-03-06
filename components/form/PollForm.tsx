import { Control, useFieldArray, UseFormReturn } from "react-hook-form";
import { useTranslations } from "next-intl";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Card } from "../cards/Card";
import { ButtonWithLabel } from "../buttons/ButtonWithLabel";
import { SmallText } from "../texts/SmallText";
import { FormFieldInputString } from "./components/FormFieldInputString";
import { FormFieldDatePicker } from "./components/FormFieldDatePicker";
import { pollFormSchema, PollFormSchemaType } from "./types";
import { FormFieldTextArea } from "./components/FormFieldTextArea";
import { Form } from "@/components/shadcn/form";
import { FormFieldCheckbox } from "@/components/form/components/FormFieldCheckbox";
import { ButtonWithChildren } from "@/components/buttons/ButtonWithChildren";
import { cn } from "@/lib/tailwind";

//TODO: Traduction

interface PollFormProps {
  form: UseFormReturn<PollFormSchemaType>;
  onSubmit: (values: PollFormSchemaType) => Promise<void>;
  isLoaded: boolean;
}

export const PollForm: React.FC<PollFormProps> = ({
  form,
  onSubmit,
  isLoaded,
}) => {
  const {
    fields: answerFields,
    append: appendAnswer,
    remove: removeAnswer,
  } = useFieldArray({
    control: form.control,
    name: "answers",
  });

  const t = useTranslations("eventForm");

  const questionMaxChars = pollFormSchema.shape.question._def.checks.find(
    (check) => check.kind === "max",
  )?.value;

  const onClickAddAnswer = () => {
    appendAnswer({ text: "" });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit, (e) => {
          console.log("s,nbezg,ekl", e);
        })}
        className="flex w-full sm:flex-row items-center sm:h-full"
      >
        <div className="flex flex-col gap-4 w-full">
          <FormFieldTextArea
            control={form.control}
            name="question"
            className="font-semibold text-3xl overflow-hidden"
            placeholder={"What do you want to ask to the community?"}
            maxLength={questionMaxChars}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // method to prevent from default behaviour
                e.preventDefault();
              }
            }}
          />
          <Card className="flex flex-col gap-[10px]">
            {answerFields.map((field, index) => (
              <PollAnswerItem
                key={field.id}
                name={`answers.${index}.text`}
                control={form.control}
                onClickRemove={() => removeAnswer(index)}
                canRemove={answerFields.length > 1}
              />
            ))}
            <AddAnswerButton onClick={onClickAddAnswer} />
          </Card>

          <Card className="flex flex-col gap-[10px]">
            <FormFieldDatePicker
              name="endDate"
              control={form.control}
              placeholder={t("end-date-placeholder")}
            />
          </Card>

          <Card>
            <FormFieldCheckbox
              name="multipleAnswers"
              control={form.control}
              label="Allow multiple answers"
            />
          </Card>

          <ButtonWithLabel
            loading={isLoaded}
            label="Create poll"
            type="submit"
          />
        </div>
      </form>
    </Form>
  );
};

const PollAnswerItem: React.FC<{
  name: `answers.${number}.text`;
  control: Control<PollFormSchemaType>;
  onClickRemove: () => void;
  canRemove: boolean;
}> = ({ name, control, onClickRemove, canRemove }) => {
  return (
    <div className="flex flex-row justify-between items-center w-full bg-muted p-2 rounded-lg">
      <div className="w-full rounded-lg bg-secondary/80 p-2">
        <FormFieldInputString
          control={control}
          name={name}
          placeholder="Enter an answer"
          className="h-6"
        />
      </div>
      {canRemove && (
        <RemoveAnswerButton onClick={onClickRemove} className="ml-2" />
      )}
    </div>
  );
};

const AddAnswerButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  return (
    <div onClick={onClick}>
      <ButtonWithChildren
        variant="ghost"
        className="flex flex-row w-full justify-start"
      >
        <div className="flex flex-row justify-start items-center w-full">
          <PlusIcon className="h-4 w-4" color="#FFFFFF" />
          <SmallText className="ml-2">Add another answer</SmallText>
        </div>
      </ButtonWithChildren>
    </div>
  );
};

const RemoveAnswerButton: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className }) => {
  return (
    <div onClick={onClick} className={cn("hover:cursor-pointer", className)}>
      <Trash2Icon className="h-4 w-4" />
    </div>
  );
};
