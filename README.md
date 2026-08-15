# Listinia Compras

A Cowork plugin for personal pantry management: captures grocery receipts
(via QR code or photo), recognizes what's still in your fridge/pantry from
photos, keeps an always-up-to-date purchase log and dashboard, generates
shopping lists based on your real consumption, and researches prices in
supermarket flyers.

This plugin is a **standalone** companion to the Listinia product (it does
not depend on the Listinia backend/SaaS being online) and was designed to
work **identically across any channel — mobile, web, or desktop** — since
most people use Cowork from their phone. See the "Data persistence"
section below before using it day to day.

## What it does

| Skill | What it does |
|---|---|
| `captura-nota-fiscal` | Reads the receipt's QR code (Playwright opens the official tax-authority page) or, if that fails, reads the photo directly. Extracts the purchased items. |
| `checagem-visual-despensa` | Recognizes items in fridge/pantry photos and confirms with you what's already run out, as part of generating the shopping list. |
| `despensa-dados` | Keeps the purchase log and current stock per item (JSONL format), with category and days-of-stock-remaining. Exports to XLSX on request. |
| `dashboard-despensa` | Always-up-to-date Markdown dashboard with spend by category, top products, most-used markets, and low-stock items. Renders in any channel. |
| `gerador-lista-compras` | Generates the shopping list for your next market trip, based on real consumption and your purchase cadence. |
| `pesquisa-encartes-mercado` | Registers your 3–5 preferred supermarkets and researches current prices on their sites via Playwright, cross-referencing your shopping list. |
| `alerta-estoque-baixo` | Checks what's running low and, if you want, schedules a recurring check with a notification. |

## How to use it

1. Photograph or attach a receipt and say something like "capture this receipt."
2. After a few purchases, ask "build my shopping list" or "how's my pantry doing?" For more accuracy, attach photos of your fridge and pantry along with the list request — the plugin confirms with you what's still on hand before finalizing the list.
3. The first time you ask for prices, Cowork will ask which markets you shop at (name, address, website, offers page).
4. Ask for the dashboard whenever you want the overall spending picture.
5. Ask for the spreadsheet (`.xlsx`) when you want to open the data in Excel.

## Files the plugin generates

- `despensa.jsonl` — current pantry state, one line per product; the source of truth for stock levels
- `nota-YYYY-MM-DD-<market>.jsonl` — line-item detail of a single purchase, written once and never rewritten
- `despensa.xlsx` — on-demand export generated from the JSONL data; not the source of truth
- `mercados.json` — registered preferred markets
- `config-habitos.json` — purchase frequency and any custom category durations
- `Listinia - Dashboard.md` — always-up-to-date Markdown dashboard

## ⚠️ Data persistence (important)

Every new Cowork conversation starts from scratch — most people use Cowork
from their phone, with no device connected. So your data doesn't "reset"
on every chat, the plugin persists it in one of two ways, in order of
preference:

**A connected local folder (fastest, when available):** if the session
has access to a folder on your computer — a Cowork project, a connected
folder, or Cowork running directly on your machine — the plugin uses it
directly. This is the best option because purchase history can grow
without ever slowing down, since new records are appended rather than
rewritten.

**Google Drive (the universal channel):** without a local folder, the
plugin uses Google Drive — works the same on mobile, web, or desktop.
Once you've connected Drive (in Claude's connector settings), there's
nothing manual to do afterward.

**Both connected? They stay in sync automatically.** A local folder is
only visible to the session that has it connected — your phone can't see
it. So whenever both channels are available in the same session, the
plugin checks which one has the newer data before writing, adopts that as
the starting point, and mirrors every local update to Drive right after
responding to you (never before — you don't wait on the mirror). That
keeps your phone and your desktop looking at the same pantry, without
needing the slow Drive round-trip on every single write.

**Neither available:** the plugin still works, but persistence becomes
manual — at the end of the conversation you receive the updated file to
keep and re-attach at the start of the next one. More work and more room
for human error, so it's worth connecting a folder or Drive if you can.
The plugin never insists: if neither is available, it says so and moves
on.

The scheduled low-stock check (`alerta-estoque-baixo`) only works with
Google Drive connected — a scheduled task runs in a brand-new session,
where there's no way to attach a file.

## Technical dependency

This plugin uses the official Playwright MCP server (`@playwright/mcp`,
via `npx`) to open tax-authority receipt pages and supermarket sites — it
requires Node.js to be available in the environment where Cowork runs
(normally already present in the Cowork sandbox). Automatic persistence
via a connected local folder requires no extra setup; the Google Drive
fallback requires the Google Drive connector to be connected on your
Claude account — optional, but recommended.

## Where the business rules come from

Product categories, default stock-duration-per-category values (e.g.,
produce 5 days, dairy 10, cleaning supplies 45), and the days-remaining
formula were ported directly from the author's real Listinia app backend
(`categorizer.py`, `config.py`, `despensa.py`), to stay consistent with a
system already validated in production rather than invented values.

## Author

Built by Thiago Bluhm — AIstein LTDA.

## Roadmap (out of scope for this version)

Flyer research is currently done live via web scraping. The plan is for
this to eventually evolve into a dedicated MCP connecting directly to the
Listinia backend's offers marketplace (where registered supermarkets
compete for demand), and for persistence to optionally use the real
Listinia backend instead of Google Drive, for users with a Listinia
account. That MCP doesn't exist yet and isn't part of this plugin.
