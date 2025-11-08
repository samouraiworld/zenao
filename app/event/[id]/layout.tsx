import React from "react";
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

  // return (
  // <HydrationBoundary state={dehydrate(queryClient)}>
  //   <ExclusiveEventGuard
  //     eventId={p.id}
  //     title={eventData.title}
  //     imageUri={eventData.imageUri}
  //     exclusive={eventData.privacy?.eventPrivacy.case === "guarded"}
  //   >
  //     <ScreenContainer
  //       background={{
  //         src: eventData.imageUri,
  //         width: imageWidth,
  //         height: imageHeight,
  //       }}
  //     >
  //       {children}
  //     </ScreenContainer>
  //   </ExclusiveEventGuard>
  // </HydrationBoundary>
  // );
}
