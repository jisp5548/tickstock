"use client";

import { Activity, ViewTransition } from "react";
import { useAdvancedView } from "./advanced/advanced-view-context";

/**
 * Sidebar + content frame. In advanced view the sidebar is hidden (not unmounted) and its "watchlist"
 * transition name hands over to the workspace's watchlist panel, so the list visibly travels across.
 */
export function AppShell({ sidebar, children }: { sidebar: React.ReactNode; children: React.ReactNode }) {
  const { active } = useAdvancedView();
  return (
    <div className="mx-auto flex max-w-[1600px] flex-col md:flex-row">
      <Activity mode={active ? "hidden" : "visible"}>
        <ViewTransition name="watchlist">{sidebar}</ViewTransition>
      </Activity>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
