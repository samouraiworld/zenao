import { ScreenContainer } from "@/components/layout/screen-container";

type Props = {
  info?: React.ReactNode;
  tabs?: React.ReactNode;
};

export default async function EventLayout({ info, tabs }: Props) {
  return (
    <ScreenContainer>
      <div className="flex flex-col gap-8">
        <div>{info}</div>
        <div>{tabs}</div>
      </div>
    </ScreenContainer>
  );
}
