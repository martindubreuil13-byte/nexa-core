import type { InputHTMLAttributes } from "react";

import { cn } from "../../lib/utils/cn";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function TextInput({ className, id, label, ...props }: TextInputProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <input className={cn("field__input", className)} id={id} {...props} />
    </label>
  );
}
