import type { ReactNode } from "react";

export function AppShell({
  header,
  sidebar,
  main,
  footer,
}: {
  header: ReactNode;
  sidebar: ReactNode;
  main: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="app-root">
      <header className="app-header">{header}</header>
      <div className="app-body">
        <aside className="app-sidebar" aria-label="统计与说明">
          {sidebar}
        </aside>
        <main className="app-main">{main}</main>
      </div>
      <footer className="app-footer">{footer}</footer>
    </div>
  );
}
