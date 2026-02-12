# MeowchineV2 — User Manual

## 🚀 Quick start

- Prerequisites: Node.js (16+), a Discord bot token and a server where you have Manage Guild permissions.
- Install: `npm install`
- Run in dev: `npm run dev` (or `npm start` to run directly).  Use `/start_bingo` to begin accepting drop submissions and `/end_bingo` to finish a bingo.
- Bot state files store per-guild data in `DATA_DIR/<guildId>.json` (`DATA_DIR` defaults to `./data`) and configuration presets live in `assets/`.
- For Railway, mount a volume and set `DATA_DIR` to that mount path (for example `/data`) so deployments do not reset state.

---

## 📋 Contents
- Installation & setup ✅
- Admin configuration (board, channels, options) 🔧
- Player workflows: submit drop, submit chest, checking status 🧑‍🤝‍🧑
- Verification flow & how verification affects progress ✅
- Autocomplete behavior and known caveats 💡
- Troubleshooting & FAQ ❓

---

## 🧰 Installation & Setup

1. Clone the repo and install dependencies:
   - `git clone ... && npm install`
2. Create a Discord application & bot and add it to your server with appropriate permissions (send messages, add reactions, manage messages if you want the bot to auto-manage messages).
3. Configure environment variables (common):
   - `DISCORD_TOKEN` (your bot token)
   - Optionally set other env vars per your deployment (see `README.md`).
4. Prepare channels in your server:
   - **Input channels** for each team (configured via `/set_input` or similar admin flows)
   - **Output channel** where admin verification messages are posted (configured via `/set_output`)
5. Start the bot: `npm run dev`.

---

## 👑 Admin Commands (summary)
Use these commands to configure boards and manage drops (needs Manage Guild permission):

- `/add_boss tile:INT boss:STRING [or:BOOL]` — assign a boss to a tile.
- `/add_drop boss:STRING drop:STRING amount:INT` — add a drop target & quantity for a boss' tile.
- `/remove_boss tile:INT` — clear a tile and related progress/pending submissions.
- `/remove_drop tile:INT drop:STRING` — remove a drop from a tile.
- `/set_teams_drop team:INT boss:STRING drop:STRING amount:INT` — manually set a team's verified count for a given drop.

Notes:
- The `team` option in `/set_teams_drop` supports autocomplete (select an existing team number).
- When adding a drop, progress shapes are automatically initialized for all teams.

---

## 🕹️ Player Workflows

### Submitting a Drop (/submit_drop)
- Command options:
  - `boss` — the boss name (autocomplete suggests bosses on the board)
  - `drop` — drop label (autocomplete suggests configured drops for that boss)
  - `amount` — optional (used for special amountable drops)
  - `image` — required proof attachment

Behavior:
- The bot posts a summary in both the submitting channel and the configured output channel.
- Admins react with ✅ to verify or ❌ to deny.
- When verified, progress for that team/tile/drop increases by the submitted amount (capped at the configured target).

Important: if many pending submissions for the same (team, tile, drop) are verified quickly, the bot now properly accumulates progress per verified submission (there is an in-process per-drop lock to avoid lost updates). If you run multiple bot processes, consider using a single instance or a cross-process locking strategy.

### Chest Verification
- Similar flow to drops but uses chest-specific verification commands (e.g., `/submit_chest` or `/chest_verify`).
- The bot tracks per-user verified chest bosses and prevents duplicate required chest verifications.
- Admins can allow chest verifications before a bingo starts by running `/open_verification` when `chestVerify` is enabled, letting players submit chest verification early.

---

## ✅ Verification & Auto-cancellation
- When a pending drop is verified (`✅`):
  - The bot increments the team's progress for that drop by the submitted amount (honoring the target cap).
  - If the target is met, the bot **auto-cancels** any remaining pending submissions for the same team/tile/drop and updates those messages to indicate they were canceled.
- When a pending drop is denied (`❌`):
  - The bot leaves progress unchanged and updates the submitting channel with a denial notice.

Known behaviour and caveats:
- Progress accumulation is now serialized in-process (prevents lost updates when multiple admins verify the SAME drop very quickly).
- If you run multiple bot processes against the same save files, consider deploying only a single process or implementing an external locking mechanism to avoid race conditions across processes.

---

## ✨ Autocomplete
- Autocomplete handlers live in `src/autocomplete/` and provide suggestions for:
  - Boss names used on the board (`suggestUsedBosses`)
  - Drops configured for the selected boss (`suggestSubmitDropsForBoss`)
  - Team numbers (`suggestTeamsForGuild`)
- If an option doesn't suggest values, ensure the command's option is configured with `.setAutocomplete(true)` (some admin commands require this to be enabled).

---

## 🧪 Testing & Validation
- Basic unit tests live in `test/run-tests.ts` and validate utility helpers and basic store behavior.
- To run tests: `npm test` (may require adjusting your shell execution policy on Windows).

---

## 🛠 Troubleshooting & FAQ
Q: Submissions show progress = 1 even after verifying multiple pending submissions.
- A: This was a race condition. Ensure you're running a bot build that includes the latest `src/events/reactions.ts` change (it uses a per-drop lock + fresh state reload). If you still see issues, slow down verifications slightly or restart to apply the newest code.

Q: Autocomplete for `/set_teams_drop` doesn't show team suggestions.
- A: Confirm the `team` option has `.setAutocomplete(true)` in `src/commands/board/add_remove_set.ts` and your client exposes autocomplete. If you installed a new command, re-register slash commands.

Q: Running tests on Windows fails due to script execution policy.
- A: PowerShell may restrict script execution; run `npm test` in a non-restricted shell or adjust PowerShell execution policy if acceptable.

---

## 💡 Tips & Best Practices
- Keep only one bot instance updating the same data files to avoid cross-process races.
- Use short, clear proof images and consistent drop labels to reduce verification friction.
- Use `/add_drop` and `/add_boss` during off-hours to avoid disrupting active bingos.

---

## 📂 Reference & File Locations
- Commands: `src/commands/` (player & admin commands)
- Verification handling: `src/events/reactions.ts`
- Autocomplete helpers: `src/autocomplete/` (index & data)
- Persistent state files: `data/<guildId>.json`
- Assets & presets: `assets/catalog/` and `assets/config/`

---

If you'd like, I can also:
- Add this manual as `USER_MANUAL.md` (done)
- Add a link to `README.md`
- Add an automated test that simulates multiple concurrent verifications
- Convert this into a GitHub Wiki page or other formats

---

_Last updated: Jan 13, 2026_