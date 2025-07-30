"use client";

import { useForm } from "react-hook-form";
import { PlusIcon, SendHorizonalIcon } from "lucide-react";
import { FormFieldTextArea } from "../widgets/form/form-field-textarea";
import { Form } from "../shadcn/form";
import { defaultScreenContainerMaxWidth } from "../layout/screen-container";
import { Button } from "../shadcn/button";
import { cn } from "@/lib/tailwind";
import { Textarea } from "../shadcn/textarea";

const FeedPostForm = () => {
  const form = useForm<{ test: string }>({
    defaultValues: {
      test: "",
    },
  });

  return (
    <Form {...form}>
      <div className="flex justify-center fixed left-0 bottom-0 z-50 w-full p-2 gap-2 bg-accent/70 backdrop-blur-md">
        <div
          className="flex flex-1 items-end gap-2"
          style={{
            maxWidth: defaultScreenContainerMaxWidth,
          }}
        >
          {/* Attachement menu button */}
          <Button
            className={cn(
              "rounded-full w-8 h-8 hover:bg-transparent hover:ring-1 hover:ring-secondary-foreground hover:text-secondary-foreground",
            )}
          >
            {<PlusIcon />}
          </Button>

          <FormFieldTextArea
            className="rounded-xl w-full"
            control={form.control}
            name="test"
            placeholder="Enter your message"
          />

          {/* Submit button */}
          <Button
            className={cn(
              "rounded-full w-8 h-8 hover:bg-transparent hover:ring-1 hover:ring-secondary-foreground hover:text-secondary-foreground",
            )}
          >
            {<SendHorizonalIcon />}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default FeedPostForm;
