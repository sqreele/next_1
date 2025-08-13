"use client";

import React from "react";
import { Image as ImageIcon } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface MissingImageProps {
  label?: string;
  className?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}

const roundedClassMap: Record<NonNullable<MissingImageProps["rounded"]>, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

export const MissingImage: React.FC<MissingImageProps> = ({
  label = "No image",
  className,
  rounded = "md",
}) => {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-gray-100 text-gray-500 border border-gray-200",
        roundedClassMap[rounded],
        className
      )}
    >
      <div className="flex items-center gap-2 px-3 py-1.5">
        <ImageIcon className="h-5 w-5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  );
};

export default MissingImage;