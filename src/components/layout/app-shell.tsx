import type { ReactNode } from "react";
import Link from "next/link";

import { logoutAction } from "../../app/(auth)/logout/actions";
import { getUser } from "../../lib/auth/getUser";

type AppShellProps = {
  children: ReactNode;
};

export async function AppShell({ children }: AppShellProps) {
  const user = await getUser();

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
                <form action={logoutAction}>
                  <button className="app-shell__link app-shell__link--button" type="submit">
                    Logout
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </header>

        <main className="app-shell__main">{children}</main>
      </div>
    </div>
  );
}
