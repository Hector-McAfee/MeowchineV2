# RS3 Bingo Bot (TypeScript + discord.js v14)

## Quickstart
1) Copy `.env.example` to `.env` and fill in values.
2) `npm install`
3) Add boss icons (PNG) to `assets/icons/` — name them after the boss (lowercase, spaces to `_`). Example: `arch-glacor.png`
4) Dev: `npm run dev` • Build: `npm run build` • Prod: `npm start`

## Notes
- Only `/bingo_create` is visible until a bingo is created (per‑guild commands).
- Board/grid is rendered with **node-canvas** using boss icons.
- All messages are embeds.
- Chest verification per player; ED1/2/3 collapsed to **ED**.
- Daily rankings posted to announcements channel at 12:00 GMT when enabled.
- First line and full board announcements supported.
