"use client";

import React from "react";

export const useIsMobile = () => {
  const [width, setWidth] = React.useState(0);

  const handleWindowSizeChange = () => {
    setWidth(window.innerWidth);
  };

  React.useEffect(() => {
    handleWindowSizeChange();
    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      window.removeEventListener("resize", handleWindowSizeChange);
    };
  }, []);

  // 640 sm value https://tailwindcss.com/docs/responsive-design
  return width < 640;
};
