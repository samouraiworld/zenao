import { Img } from "@react-email/components";
import React from "react";

export const EmailEventImg: React.FC<{ src: string }> = ({ src }) => {
  return (
    <Img
      alt="Event image"
      style={{
        width: "100%",
        objectFit: "cover",
        aspectRatio: "16/9",
      }}
      src={src}
    />
  );
};
