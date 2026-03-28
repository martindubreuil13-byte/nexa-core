import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAction } from "../../app/(auth)/logout/actions";
import { getUserState } from "../../lib/user/getUserState";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const { hasCases, user } = await getUserState();
  const workspaceHref = hasCases ? "/freelancer" : "/onboarding/case";

  return (
    <div className="app-shell">
      <div className="app-shell__backdrop">
        <header className="app-shell__nav">
          <div className="app-shell__nav-inner">
            <Link className="app-shell__brand" href="/">
              <span className="app-shell__brand-name">NEXA</span>
              <span className="app-shell__brand-copy">by MINDRA</span>
            </Link>

            <div className="app-shell__links">
              {user ? (
                <>
                  <Link className="app-shell__link" href={workspaceHref}>
                    Workspace
                  </Link>
                  <form action={logoutAction}>
                    <button className="app-shell__link app-shell__link--button" type="submit">
                      Logout
                    </button>
                  </form>
                </>
              ) : (
                <Link className="app-shell__link" href="/login">
                  Login
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
