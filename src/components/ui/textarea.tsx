import * as React from "react";

import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-gray-400/75 bg-white px-3 py-1 text-base shadow-sm transition-colors placeholder:text-gray-500 focus-visible:ring-1 focus-visible:border-primary-500 focus-visible:outline-none focus-visible:ring-primary-500 md:text-sm disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
