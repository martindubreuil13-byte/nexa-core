import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "../../lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = {
  children: ReactNode;
  className?: string;
  href?: string;
  variant?: ButtonVariant;
} & Omit<ComponentPropsWithoutRef<"button">, "children">;

export function Button({
  children,
  className,
  href,
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  const classes = cn("button", `button--${variant}`, className);

  if (href) {
    return (
      <Link className={classes} href={href}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} type={type} {...props}>
      {children}
    </button>
  );
}
