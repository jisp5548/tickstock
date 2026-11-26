# Tickstock

A stock watchlist modelled on Apple's Stocks app, built with Next.js 16 (App Router) and the AlphaVantage API.

- **Homepage**: 15 stocks with logos, a 1-month sparkline, price and a change pill. On desktop it shows a sidebar list plus a tile grid; on phones the list is the whole homepage, as on iPhone.
- **Stock page** (`/stock/[symbol]`): an interactive price chart (1W to ALL, with scrubbing and keyboard inspection), Apple-style statistics, news, the company profile, and the daily price history.
- **Search**: ⌘K / Ctrl+K or `/` opens a command palette. It filters the watchlist instantly and searches every US listing when you press Enter.
- **Shading**: the area under every line can be switched on or off with `F`, from the palette, or with the chart's toggle. The choice is remembered.
- **Advanced view** (press `V` on any stock): a TradingView-style workspace. See below.

### Keyboard shortcuts

| Key | Action |
| --- | --- |
| `⌘K` / `Ctrl K`, `/` | Search and actions |
| `F` | Toggle shading under charts |
| `V` | Switch a stock between standard and advanced view |
| `Esc` | Close the menu or palette, then leave advanced view |
| `C` / `M` | Crosshair / measure tool (advanced view) |
| `+` / `-` / `0` | Zoom in / out / fit (advanced view; scroll and drag also zoom and pan) |
| `←` / `→` | Move the crosshair when a chart is focused |

## Advanced view

The standard stock page is Apple-like. The advanced view gives the app its own identity: a TradingView-style workspace made of panels floating on black.

| Area | Contents |
| --- | --- |
| Toolbar | Symbol search, candles / line, an Indicators menu (Volume, MA 20, MA 50), shading |
| Left rail | Crosshair and measure tools, plus zoom and fit |
| Chart | Candlesticks with volume and moving averages, an OHLC legend that follows the crosshair, axis tags, scroll-to-zoom and drag-to-pan |
| Bottom bar | Ranges |
| Right panel | Watchlist table, plus a symbol card with price, volume vs. average and the 52-week range |

**How the switch stays seamless:**
- **One morph for everything.** Toggling runs in a React transition, so named `<ViewTransition>` elements morph from their standard positions into the workspace in a single motion. The sidebar becomes the watchlist; the search box becomes the toolbar's symbol chip; the line chart becomes the candle chart; the price, logo, symbol and range tabs move into place.
- **Choreography** (`app/globals.css`):
  - Entering takes 520ms and leaving takes 380ms, both eased in and out.
  - Old snapshots clear out before new ones fade in, so large crossfades never stack two images.
  - The watchlist travels on an arc. The chart dips slightly before growing and settles at the end (under 1%, not a bounce).
  - Workspace-only panels arrive from their own edges, staggered.
- **Nothing reloads.** The standard page stays mounted while hidden (`<Activity>`), and the selected range is shared, so switching back and forth keeps your place. Picking another stock in the watchlist stays in advanced view.
- **Fast drawing.** Each candle color, wick color and volume color is drawn as a single SVG path, so even ~1,350 weekly bars re-render cheaply while zooming and panning.

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the keys below
npm run dev
```

| Variable | Where to get it |
| --- | --- |
| `ALPHAVANTAGE_API_KEY` | https://www.alphavantage.co/support/#api-key (free) |
| `TAVILY_API_KEY` | https://app.tavily.com (free tier, used for news) |

The app also runs with **no keys at all**. It serves the snapshot committed in `data/cache/` and shows a "Cached snapshot" badge.

## Living with the free tier (25 AlphaVantage calls a day)

The homepage alone needs 15 calls, so the data layer is built around saving quota:

1. **Persistent stale-while-revalidate cache** (`lib/file-cache.ts`). Every response is written to `data/cache/<kind>/<SYMBOL>.json`.
   - Stored data is served immediately. Stale entries refresh in the background, and the network blocks only when nothing is stored yet.
   - Failed refreshes back off for 15 minutes.
2. **The committed cache is the fallback snapshot.** When the quota is spent, users still get real (older) data, with an honest badge.
3. **`"use cache"` on top** (`lib/market.ts`). Successful loads are cached for hours, while failures are cached for minutes so a refilled quota is picked up quickly.
4. **Calls are throttled** about 1 per second, since bursts trip AlphaVantage's limit.
5. **Prefetching** fetches only the shared page shell by default. Hovering a stock prefetches the full page, so a page full of links never burns quota.
6. **Ranges are split by source.** Free daily data covers about 100 trading days, so 1W to 3M use the daily series and 6M to ALL use the weekly series.

Refresh the snapshot with:

```bash
npm run snapshot
```

It only fetches missing or stale entries, so if the quota cuts it short, run it again the next day.

## Design decisions

### One period per view

In the list, the sparkline, the change pill and the red/green color all describe the **same period (1 month)**, so a row never shows a red line next to a green pill. Desktop tiles also show today's move. The stock page opens on the same 1M range.

## Project layout

```
app/                 routes (layout with sidebar, homepage tiles, /stock/[symbol]) and the search server action
components/          UI: sidebar, quote rows and tiles, command palette, sheet, logo, sparkline
components/stock/    stock page: chart, range tabs, statistics, profile, news, history, sheet, standard/advanced switch
components/advanced/ advanced view: context, workspace, candle chart, watchlist + details panel
lib/                 AlphaVantage and Tavily clients, cache, data sources, series math, formatting, preferences
data/cache/          committed snapshot / persistent cache
scripts/snapshot.mts refreshes the snapshot within the daily quota
```
