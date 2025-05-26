"use client";

import React, { useEffect, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import {
  StandardPostForm,
  FeedInputMode,
} from "@/components/form/social-feed/standard-post-form";
import { PollPostForm } from "@/components/form/social-feed/poll-post-form";
import { FeedPostFormSchemaType } from "@/components/form/types";

const _eventTabs = ["description", "discussion", "votes"] as const;
export type EventTab = (typeof _eventTabs)[number];

const EventFeedForm = ({
  eventId,
  form,
}: {
  eventId: string;
  form: UseFormReturn<FeedPostFormSchemaType>;
}) => {
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [feedInputMode, setFeedInputMode] =
    useState<FeedInputMode>("STANDARD_POST");
  const parentPost = form.watch("parentPost");

  useEffect(() => {
    if (feedInputMode === "POLL") {
      form.setValue("kind", "POLL");
    } else {
      form.setValue("kind", "STANDARD_POST");
    }
  }, [feedInputMode, form]);

  useEffect(() => {
    if (parentPost) {
      setFeedInputMode("STANDARD_POST");
      if (formContainerRef.current) {
        window.scrollTo({
          top: formContainerRef.current.offsetTop,
        });
      }
    }
  }, [parentPost, formContainerRef, setFeedInputMode]);

  return (
    <div
      ref={formContainerRef}
      className="flex justify-center w-full transition-all duration-300 bg-secondary/80"
    >
      <div className="w-full">
        {feedInputMode === "POLL" ? (
          <PollPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            form={form}
          />
        ) : (
          <StandardPostForm
            eventId={eventId}
            feedInputMode={feedInputMode}
            setFeedInputMode={setFeedInputMode}
            form={form}
          />
        )}
      </div>
    </div>
  );
};

export default EventFeedForm;

// export const EventFeedForm = forwardRef<
//   HTMLDivElement,
//   {
//     eventId: string;
//   }
// >(({ eventId }, ref) => {
//   const inputContainerRef = useRef<HTMLDivElement>(null);
//   const [feedInputMode, setFeedInputMode] =
//     useState<FeedInputMode>("STANDARD_POST");
//   const feedMaxWidth =
//     screenContainerMaxWidth - screenContainerMarginHorizontal * 2;

//   return (
//     <div
//       ref={mergeRefs(ref, inputContainerRef)}
//       className={cn(
//         "flex justify-center w-full transition-all duration-300 bg-transparent",
//       )}
//     >
//       <div
//         className="w-full"
//         style={{
//           maxWidth: feedMaxWidth,
//         }}
//       >
//         {feedInputMode === "POLL" ? (
//           <PollPostForm
//             eventId={eventId}
//             feedInputMode={feedInputMode}
//             setFeedInputMode={setFeedInputMode}
//           />
//         ) : (
//           <StandardPostForm
//             eventId={eventId}
//             feedInputMode={feedInputMode}
//             setFeedInputMode={setFeedInputMode}
//           />
//         )}
//       </div>
//     </div>
//   );
// });

// EventFeedForm.displayName = "EventFeedForm";
