import Link from "next/link";
import { buttonVariants } from "@/components/shadcn/button";
import Text from "@/components/widgets/texts/text";
import { cn } from "@/lib/tailwind";

export const LinkBadge: React.FC<{
  href: string;
  label: string;
  className?: string;
}> = ({ href, label, className }) => {
  const disabled = href === "";

  const content = (
    <>
      <Text variant="secondary" size="sm">
        {label}
      </Text>
    </>
  );

  const containerClassName = cn(
    buttonVariants({ variant: "secondary" }),
    "w-max",
    className,
  );

  if (disabled) {
    return <div className={containerClassName}>{content}</div>;
  }

  return (
    <Link className={containerClassName} href={href} target="_blank">
      {content}
    </Link>
  );
};
