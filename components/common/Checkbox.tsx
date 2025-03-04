import { cn } from "@/lib/tailwind";
import { SmallText } from "@/components/texts/SmallText";

const CheckboxBase: React.FC<{
  checked: boolean;
  className?: string;
}> = ({ className, checked }) => {
  return (
    <div
      className={cn(
        "h-4 w-4 border-2 border-gray-300 rounded-sm",
        checked && "bg-gray-300",
        className,
      )}
    />
  );
};

export const Checkbox: React.FC<{
  checked: boolean;
  className?: string;
}> = ({ className, checked }) => {
  return <CheckboxBase className={className} checked={checked} />;
};

export const CheckboxRounded: React.FC<{
  checked: boolean;
  className?: string;
}> = ({ className, checked }) => {
  return (
    <Checkbox className={cn("rounded-2xl", className)} checked={checked} />
  );
};

export const CheckboxWithLabel: React.FC<{
  checked: boolean;
  label: string;
  className?: string;
}> = ({ checked, label, className }) => {
  return (
    <div className="flex flex-row items-center justify-between">
      <SmallText>{label}</SmallText>
      <CheckboxBase className={className} checked={checked} />
    </div>
  );
};
