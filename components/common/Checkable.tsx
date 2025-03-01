import { cn } from "@/lib/tailwind";

const CheckableBase: React.FC<{
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

export const Checkable: React.FC<{
  checked: boolean;
  className?: string;
}> = ({ className, checked }) => {
  return <CheckableBase className={className} checked={checked} />;
};

export const CheckableRounded: React.FC<{
  checked: boolean;
  className?: string;
}> = ({ className, checked }) => {
  return (
    <Checkable className={cn("rounded-2xl", className)} checked={checked} />
  );
};
