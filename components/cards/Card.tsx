"use client";

import React from "react";
import { cn } from "@/lib/tailwind";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "rounded-xl px-4 py-3 bg-secondary/80 backdrop-blur-sm",
        className,
      )}
    >
      {children}
    </div>
  );
};
