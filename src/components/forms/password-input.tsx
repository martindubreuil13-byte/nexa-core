"use client";

import type { InputHTMLAttributes } from "react";
import { useId, useState } from "react";

import { cn } from "../../lib/utils/cn";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
};

export function PasswordInput({
  className,
  id,
  label,
  ...props
}: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <label className="field" htmlFor={inputId}>
      <span className="field__label">{label}</span>
      <div className="field__control">
        <input
          className={cn("field__input", className)}
          id={inputId}
          type={isVisible ? "text" : "password"}
          {...props}
        />
        <button
          className="field__toggle"
          onClick={() => setIsVisible((value) => !value)}
          type="button"
        >
          {isVisible ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}
