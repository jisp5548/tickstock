"use client";

import { Command } from "cmdk";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { useRouter } from "next/navigation";
import { createContext, use, useEffect, useState, useTransition } from "react";
import { searchMarkets } from "@/app/actions";
import { EASE_IN, EASE_OUT } from "@/lib/motion";
import { markInAppNavigation } from "@/lib/navigation";
import { useAreaFill, usePillMode } from "@/lib/preferences";
import { useIsMobile } from "@/lib/use-is-mobile";
import { WATCHLIST } from "@/lib/watchlist";
import { AnimatedPlaceholder } from "./animated-placeholder";
import { Kbd } from "./kbd";
import { Sheet } from "./sheet";

const PaletteContext = createContext<() => void>(() => {});

/** Opens the command palette; for triggers anywhere in the tree. */
export function useOpenPalette(): () => void {
  return use(PaletteContext);
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
}

/**
 * Owns the palette's open state and the app-wide shortcuts: ⌘K / Ctrl+K or "/" to search, "F" to toggle
 * chart fill. Also makes every motion animation honor the OS reduced-motion setting.
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [, toggleFill] = useAreaFill();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "/") {
        event.preventDefault();
        setOpen(true);
      } else if (event.key.toLowerCase() === "f") {
        toggleFill();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleFill]);

  return (
    <MotionConfig reducedMotion="user">
      <PaletteContext value={() => setOpen(true)}>
        {children}
        <AnimatePresence>{open && <CommandPalette onClose={() => setOpen(false)} />}</AnimatePresence>
      </PaletteContext>
    </MotionConfig>
  );
}

const EXAMPLE_QUERIES = ["Apple", "NVDA", "Coca-Cola", "Netflix", "TSLA"];

/**
 * Substring matching (symbol-prefix hits first) instead of cmdk's default fuzzy match, which ranks loose
 * hits like "tesco" → "The Walt DiSney COmpany" above the "Search all markets" row and steals Enter.
 */
function matchScore(value: string, search: string): number {
  const haystack = value.toLowerCase();
  const needle = search.trim().toLowerCase();
  if (haystack.startsWith(needle)) return 1;
  return haystack.includes(needle) ? 0.5 : 0;
}

/** The last remote search and the query it answered (results only show while the input still matches it). */
type RemoteSearch = Awaited<ReturnType<typeof searchMarkets>> & { query: string };

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const mobile = useIsMobile();
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<RemoteSearch>();
  const [searching, startSearch] = useTransition();
  const [fillOn, toggleFill] = useAreaFill();
  const [pillMode, togglePillMode] = usePillMode();
  useEffect(() => {
    const opener = document.activeElement;
    return () => (opener instanceof HTMLElement ? opener.focus() : undefined);
  }, []);

  function go(symbol: string) {
    markInAppNavigation();
    router.push(`/stock/${symbol}`);
    onClose();
  }

  function run(action: () => void) {
    action();
    onClose();
  }

  /** Remote search only runs on an explicit Enter/click, never while typing: each call spends API quota. */
  function searchAllMarkets() {
    const submitted = query.trim();
    startSearch(async () => setRemote({ ...(await searchMarkets(submitted)), query: submitted }));
  }

  const trimmed = query.trim();
  const answered = remote?.query === trimmed ? remote : undefined;

  const content = (
    <Command
      label="Search stocks"
      filter={matchScore}
      loop
      onKeyDown={(event) => event.key === "Escape" && onClose()}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="p-3">
        <div className="iridescent relative flex items-center gap-2 rounded-2xl border-2 border-transparent px-3">
          <SearchIcon />
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            aria-label="Search stocks"
            className="h-11 flex-1 bg-transparent text-base caret-azure outline-none"
          />
          {!query && <AnimatedPlaceholder phrases={EXAMPLE_QUERIES} prefix="Search " />}
          <Kbd className="max-md:hidden">Esc</Kbd>
        </div>
      </div>

      <Command.List className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted">
        <Command.Group heading="Watchlist">
          {WATCHLIST.map((entry) => (
            <PaletteItem key={entry.symbol} value={`${entry.symbol} ${entry.name}`} onSelect={() => go(entry.symbol)}>
              <span className="w-14 font-semibold">{entry.symbol}</span>
              <span className="truncate text-muted">{entry.name}</span>
            </PaletteItem>
          ))}
        </Command.Group>

        {trimmed && (
          <Command.Group heading="All markets" forceMount>
            {answered?.status === "ok" &&
              answered.data.map((match) => (
                <PaletteItem key={match.symbol} value={`remote ${match.symbol}`} forceMount onSelect={() => go(match.symbol)}>
                  <span className="w-14 font-semibold">{match.symbol}</span>
                  <span className="truncate text-muted">{match.name}</span>
                </PaletteItem>
              ))}
            {answered?.status !== "ok" && (
              <PaletteItem value={`search-all ${trimmed}`} forceMount onSelect={searchAllMarkets} disabled={searching}>
                <span className="flex-1 truncate">
                  {searching ? "Searching…" : <>Search all markets for “{trimmed}”</>}
                </span>
                {searching ? <Spinner /> : <Kbd>↵</Kbd>}
              </PaletteItem>
            )}
            {answered && <RemoteFeedback search={answered} />}
          </Command.Group>
        )}

        <Command.Group heading="Actions">
          <PaletteItem value="toggle chart fill shading area" onSelect={() => run(toggleFill)}>
            <span className="flex-1">{fillOn ? "Hide" : "Show"} shading under charts</span>
            <Kbd>F</Kbd>
          </PaletteItem>
          <PaletteItem value="show change as dollars percent" onSelect={() => run(togglePillMode)}>
            <span className="flex-1">Show changes in {pillMode === "percent" ? "dollars" : "percent"}</span>
          </PaletteItem>
        </Command.Group>
      </Command.List>
    </Command>
  );

  if (mobile) {
    return (
      <Sheet
        draggable
        onDismiss={onClose}
        role="dialog"
        aria-modal
        aria-label="Search"
        backdropClassName="fixed inset-0 z-40 bg-black/60"
        initial={{ y: "100%" }}
        animate={{ y: 0, transition: { duration: 0.32, ease: EASE_OUT } }}
        exit={{ y: "100%", transition: { duration: 0.2, ease: EASE_IN } }}
        className="fixed inset-x-0 bottom-0 z-50 flex h-[85dvh] flex-col rounded-t-[28px] bg-panel pb-[env(safe-area-inset-bottom)] ring-1 ring-white/10"
      >
        {content}
      </Sheet>
    );
  }

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed inset-0 z-40 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.18 } }}
        exit={{ opacity: 0, transition: { duration: 0.12 } }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal
        aria-label="Search"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1, transition: { duration: 0.18, ease: EASE_OUT } }}
        exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12, ease: EASE_IN } }}
        className="squircle fixed top-[12vh] left-1/2 z-50 flex max-h-[min(560px,76vh)] w-[min(560px,calc(100vw-32px))] -translate-x-1/2 origin-top flex-col overflow-hidden rounded-3xl bg-panel shadow-2xl ring-1 ring-white/10 [--radius:24px]"
      >
        {content}
      </motion.div>
    </>
  );
}

function PaletteItem({ className = "", ...props }: React.ComponentProps<typeof Command.Item>) {
  return (
    <Command.Item
      {...props}
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-100 data-[disabled=true]:cursor-default data-[selected=true]:bg-white/[0.07] ${className}`}
    />
  );
}

function RemoteFeedback({ search }: { search: RemoteSearch }) {
  const message =
    search.status !== "ok"
      ? "Search is unavailable right now. Try again later."
      : search.data.length === 0
        ? `No US listings match “${search.query}”.`
        : null;
  return message && <p className="px-3 py-2 text-sm text-down" role="status">{message}</p>;
}

function Spinner() {
  return <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-azure" aria-hidden />;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
      <circle cx="9" cy="9" r="6" />
      <path d="m14 14 4 4" strokeLinecap="round" />
    </svg>
  );
}
