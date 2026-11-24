<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- The game is the user's prebuilt bundle, served from `public/game/` and shown full-screen at `/` in an iframe. Edit `game-src/` (original prettified bundle + `truck-*.js` add-ons) and regenerate with `python3 game-src/build.py`; never hand-edit `public/game/assets/game.js` — it is overwritten by the build.
- Game media lives in Lovable Assets (`src/assets/game/*.asset.json`); `build.py` writes `public/game/asset-map.js` so the bundle's asset loader resolves CDN URLs — upload new media there instead of copying binaries into `public/`.
- `window.__truck` exposes the dump-truck state for browser checks (load, bed, engine), because the sandbox renders too slowly to drive the game by keyboard alone.
