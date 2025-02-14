"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { useSession } from "@clerk/nextjs";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { zenaoClient } from "../zenao-client";
import { useToast } from "@/app/hooks/use-toast";
import { userFormSchema, UserFormSchemaType } from "@/components/form/types";
import { Form } from "@/components/shadcn/form";
import { FormFieldInputString } from "@/components/form/components/FormFieldInputString";
import { Card } from "@/components/cards/Card";
import { ButtonWithLabel } from "@/components/buttons/ButtonWithLabel";
import { FormFieldTextArea } from "@/components/form/components/FormFieldTextArea";
import { FormFieldURI } from "@/components/form/components/FormFieldURI";
import { userOptions } from "@/lib/queries/user";

export const EditUserForm: React.FC<{ authToken: string | null }> = ({
  authToken,
}) => {
  const { data: user } = useSuspenseQuery(userOptions(authToken));

  const { session } = useSession();
  const [loading, setLoading] = useState<boolean>(false);
  const form = useForm<UserFormSchemaType>({
    mode: "all",
    resolver: zodResolver(userFormSchema),
    defaultValues: user!,
  });
  const { toast } = useToast();

  const queryClient = useQueryClient();

  const handleEditUserSuccess = useCallback(async () => {
    const opts = userOptions(authToken);
    await queryClient.cancelQueries(opts);
    queryClient.setQueryData(opts.queryKey, (user) => user);
  }, [queryClient, authToken]);

  const onSubmit = async (values: UserFormSchemaType) => {
    try {
      setLoading(true);
      const token = await session?.getToken();
      if (!token) {
        throw new Error("invalid clerk token");
      }
      await zenaoClient.editUser(values, {
        headers: { Authorization: "Bearer " + token },
      });
      handleEditUserSuccess();
      toast({
        title: "Edited!",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error on editing user!",
      });
      console.error("error", err);
    }
    setLoading(false);
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="items-center sm:h-full"
      >
        <div className="flex flex-col sm:flex-row w-full gap-10">
          <FormFieldURI<UserFormSchemaType>
            form={form}
            name="avatarUri"
            placeholder="avatarURI"
          />
          <div className="flex flex-col gap-4 w-full sm:w-3/5">
            <Card>
              <FormFieldInputString<UserFormSchemaType>
                control={form.control}
                name="displayName"
                placeholder="Display name..."
              />
            </Card>
            <Card>
              <FormFieldTextArea<UserFormSchemaType>
                control={form.control}
                name="bio"
                placeholder="Bio..."
              />
            </Card>
            <div>
              <ButtonWithLabel
                loading={loading}
                label="Save changes"
                type="submit"
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
};
