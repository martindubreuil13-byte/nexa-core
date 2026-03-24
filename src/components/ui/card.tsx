import type { ReactNode } from "react";

import { cn } from "../../lib/utils/cn";

type CardProps = {
  children?: ReactNode;
  className?: string;
  compact?: boolean;
  description?: string;
  title: string;
};

export function Card({ children, className, compact = false, description, title }: CardProps) {
  return (
    <section className={cn("surface", "card", compact && "card--compact", className)}>
      <h2 className="card__title">{title}</h2>
      {description ? <p className="card__copy">{description}</p> : null}
      {children ? <div className="stack" style={{ marginTop: 18 }}>{children}</div> : null}
    </section>
  );
}
