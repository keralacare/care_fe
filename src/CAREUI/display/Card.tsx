import { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export default function Card(
  props: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
    children?: ReactNode;
    title?: ReactNode;
    titleRight?: ReactNode;
    tight?: boolean;
    titleVariant?: "small" | "medium" | "large";
  },
) {
  const {
    children,
    title,
    titleRight,
    className,
    tight = false,
    titleVariant = "medium",
    ...rest
  } = props;

  let titleClasses = "";
  switch (titleVariant) {
    case "small":
      titleClasses = "text-xs opacity-70 font-semibold";
      break;
    case "medium":
      titleClasses = "text-sm opacity-70 font-semibold";
      break;
    case "large":
      titleClasses = "text-lg font-bold";
      break;
  }

  return (
    <div
      {...rest}
      className={cn(
        "rounded-lg bg-white border border-secondary-200 overflow-hidden",
        !title && !titleRight && (tight ? "pt-2" : "pt-4"),
        className,
      )}
    >
      {(title || titleRight) && (
        <div
          className={`flex justify-between items-center ${tight ? "px-2 pt-2 mb-1" : "px-4 pt-4 mb-2"}`}
        >
          <div className={titleClasses}>{title}</div>
          <div>{titleRight}</div>
        </div>
      )}
      <div className={tight ? "px-2 pb-2" : "px-4 pb-4"}>{children}</div>
    </div>
  );
}
