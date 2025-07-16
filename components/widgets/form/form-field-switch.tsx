import { FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/shadcn/form";
import { Switch } from "@/components/shadcn/switch";
import { FormFieldProps } from "@/types/schemas";

type FormFieldSwitchProps<T extends FieldValues> = FormFieldProps<
  T,
  boolean
> & { label?: React.ReactNode };

export function FormFieldSwitch<T extends FieldValues>({
  control,
  name,
  className,
  label,
}: FormFieldSwitchProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <div className="flex items-center gap-2">
            <FormControl>
              <Switch
                className={className}
                name={name}
                data-name={name}
                checked={field.value}
                onCheckedChange={(checked: boolean) => {
                  field.onChange(checked);
                }}
              />
            </FormControl>
            <FormLabel>{label}</FormLabel>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
