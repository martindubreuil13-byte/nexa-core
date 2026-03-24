import type { ReactNode } from "react";

type AuthFormShellProps = {
  children: ReactNode;
  description: string;
  eyebrow: string;
  footer?: ReactNode;
  title: string;
};

export function AuthFormShell({
  children,
  description,
  eyebrow,
  footer,
  title,
}: AuthFormShellProps) {
  return (
    <div className="auth-shell">
      <section className="auth-panel">
        <div className="auth-shell__header">
          <span className="eyebrow">{eyebrow}</span>
          <div className="auth-shell__intro">
            <h1 className="auth-shell__title">{title}</h1>
            <p className="auth-shell__description">{description}</p>
          </div>
        </div>
        {children}
        {footer ? (
          <>
            <div className="divider" />
            <div className="auth-shell__footer">{footer}</div>
          </>
        ) : null}
      </section>
    </div>
  );
}
