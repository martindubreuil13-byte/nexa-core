import type { TextareaHTMLAttributes } from "react";

import { cn } from "../../lib/utils/cn";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ className, id, label, ...props }: TextareaProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <textarea className={cn("field__input", "field__textarea", className)} id={id} {...props} />
    </label>
  );
}
