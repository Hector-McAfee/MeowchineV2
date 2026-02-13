import type { AutocompleteInteraction } from "discord.js";
import { load } from "../state/store.js";
import { MAX_TILES } from "../config.js";

/* ---------------- Aliases (optional) ---------------- */

let ALIASES: Record<string, string> = {};
try {
  const mod = await import("../../assets/config/aliases.json", { assert: { type: "json" } });
  const raw = mod.default as Record<string, string>;
  for (const [k, v] of Object.entries(raw)) ALIASES[k.toLowerCase()] = v;
} catch {
  // aliases are optional
}

/* ---------------- Utils ---------------- */

function norm(s: string): string {
  return (s ?? "").toLowerCase().trim();
}

function normalizedBossKey(label: string): string {
  return norm(canonBossName(label));
}

/** Canonicalize a boss name (alias-aware). Optionally collapse ED1/2/3 -> ED for chest flows. */
export function canonBossName(raw: string, opts: { forChest?: boolean } = {}): string {
  const cleaned = (raw ?? "").replace(/’/g, "'").trim();
  if (!cleaned) return "";

  const lc = norm(cleaned);

  if (opts.forChest) {
    if (lc === "ed" || lc === "e's" || lc === "es") return "ED";
    if (lc.startsWith("ed1") || lc.startsWith("ed 1")) return "ED";
    if (lc.startsWith("ed2") || lc.startsWith("ed 2")) return "ED";
    if (lc.startsWith("ed3") || lc.startsWith("ed 3")) return "ED";
    if (lc.startsWith("elite dungeon 1")) return "ED";
    if (lc.startsWith("elite dungeon 2")) return "ED";
    if (lc.startsWith("elite dungeon 3")) return "ED";
  }

  const via = ALIASES[lc];
  return via ? via : cleaned;
}

function toChoices(values: string[], q: string) {
  const needle = norm(q);
  return values
    .filter((v) => !needle || norm(v).includes(needle))
    .slice(0, 25)
    .map((v) => ({ name: v, value: v }));
}

/* ---------------- Tiles / Boss suggestions ---------------- */

export async function suggestTileNumbers(i: AutocompleteInteraction) {
  const s = await load(i.guildId!);
  const cap = MAX_TILES[s.options.boardSize];
  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  const all = Array.from({ length: cap }, (_, k) => String(k + 1));
  return toChoices(all, q);
}

/**
 * Suggest only tile numbers that are not assigned a boss yet.
 */
export async function suggestEmptyTileNumbers(i: AutocompleteInteraction) {
  const s = await load(i.guildId!);
  const cap = MAX_TILES[s.options.boardSize];
  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  const out: string[] = [];
  const tiles = s.tiles || {};
  for (let k = 1; k <= cap; k++) {
    const tile = (tiles as any)[String(k)];
    if (!tile || !tile.boss) out.push(String(k));
  }
  return toChoices(out, q);
}

/** Suggest team numbers available in the current bingo */
export async function suggestTeamsForGuild(i: AutocompleteInteraction) {
  const s = await load(i.guildId!);
  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  const teams = Object.keys(s.teamToChannel || {}).sort((a, b) => Number(a) - Number(b));
  return toChoices(teams, q);
}

/** Bosses actually placed on the current board (used outside setup). */
export async function suggestUsedBosses(i: AutocompleteInteraction) {
  const s = await load(i.guildId!);
  const all = new Set<string>();
  for (const tile of Object.values(s.tiles || {})) {
    if ((tile as any)?.boss) all.add(String((tile as any).boss));
  }
  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  return toChoices(Array.from(all), q);
}

/** For setup flows we can keep it identical (only bosses already placed). */
export async function suggestBossesForSetup(i: AutocompleteInteraction) {
  return suggestUsedBosses(i);
}

/**
 * Return all boss names from the provided catalog (sorted), used for setup
 * flows where admins want to pick from the complete list.
 */
export async function suggestAllCatalogBosses(i: AutocompleteInteraction, catalog: Record<string, string[]>) {
  const s = await load(i.guildId!);
  const q = i.options.getFocused(true)?.value?.toString() ?? "";

  // Build a normalized set of bosses already on the board so we can exclude them.
  // Use regular boss canonicalization (not chest canonicalization), so ED1/ED2/ED3
  // remain distinct for board setup.
  const present = new Set<string>();
  for (const t of Object.values(s.tiles || {})) {
    const tb = (t as any)?.boss;
    if (!tb) continue;
    present.add(normalizedBossKey(tb));
  }

  const all = Object.keys(catalog || {})
    .filter((k) => !present.has(normalizedBossKey(k)))
    .sort((a, b) => a.localeCompare(b));

  return toChoices(all, q);
}

/* ---------------- Drops per boss (catalog-driven) ---------------- */

/**
 * Suggest drops for a selected boss, excluding ones already configured on that boss’ tile.
 * `catalog` shape: { [BossName]: string[] }
 */
export async function suggestDropsForBoss(
  i: AutocompleteInteraction,
  catalog: Record<string, string[]>
) {
  const s = await load(i.guildId!);

  const bossRaw = i.options.getString("boss");
  if (!bossRaw) return [];

  // Find tile that uses this boss
  let tileNum: number | null = null;
  for (const [t, data] of Object.entries(s.tiles || {})) {
    if ((data as any)?.boss === bossRaw) {
      tileNum = Number(t);
      break;
    }
  }

  // Exclude drops already added
  const already = new Set<string>(
    tileNum && (s.tiles as any)[tileNum]?.drops ? Object.keys((s.tiles as any)[tileNum].drops) : []
  );

  // Catalog lookup with forgiving normalization
  const keyVariants = [
    bossRaw,
    bossRaw.replace(/’/g, "'"),
    canonBossName(bossRaw),
  ];
  const list =
    catalog[keyVariants[0]] ??
    catalog[keyVariants[1]] ??
    catalog[keyVariants[2]] ??
    [];

  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  const candidates = list.filter((d) => !already.has(d));
  return toChoices(candidates, q);
}

/**
 * Autocomplete used specifically for `/submit_drop` — only suggest drops that
 * are present somewhere on the current bingo board for the selected boss.
 * Do not fall back to the global catalog.
 */
export async function suggestSubmitDropsForBoss(i: AutocompleteInteraction) {
  const s = await load(i.guildId!);
  const bossRaw = i.options.getString("boss");
  if (!bossRaw) return [];

  const bossKeyChest = normalizedForChest(bossRaw);
  const bossKeyNorm = norm(bossRaw);
  const bossCanon = canonBossName(bossRaw);

  const boardDrops = new Map<string, string>();

  function bossMatches(tileBoss: string): boolean {
    if (!tileBoss) return false;
    const tbChest = normalizedForChest(tileBoss);
    const tbNorm = norm(tileBoss);
    const tbCanon = canonBossName(tileBoss);
  // Strict equality checks only — rely on normalized / canonical forms that
  // match how bosses are stored in state or the catalog. Avoid substring
  // matches as similar boss names can overlap.
  if (tbChest === bossKeyChest) return true;
  if (tbNorm === bossKeyNorm) return true;
  if (tbCanon === bossCanon) return true;
  return false;
  }

  for (const tile of Object.values(s.tiles || {})) {
    const tb = (tile as any)?.boss;
    if (!tb) continue;
    if (!bossMatches(tb)) continue;

    const dropsRaw = (tile as any).drops;
    if (!dropsRaw) continue;

    // drops can be stored as an object map, array, or simple string. Normalize all.
    if (Array.isArray(dropsRaw)) {
      for (const d of dropsRaw) if (typeof d === "string" && d.trim()) boardDrops.set(norm(d), d);
    } else if (typeof dropsRaw === "object") {
      for (const key of Object.keys(dropsRaw)) {
        if (typeof key === "string" && key.trim()) boardDrops.set(norm(key), key);
      }
    } else if (typeof dropsRaw === "string") {
      const d = dropsRaw.trim();
      if (d) boardDrops.set(norm(d), d);
    }
  }

  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  if (boardDrops.size === 0) return [];

  const candidates = Array.from(new Set(Array.from(boardDrops.values()))).sort((a, b) => a.localeCompare(b));
  return toChoices(candidates, q);
}

/* ---------------- Chest verification helpers ---------------- */

function normalizedForChest(label: string): string {
  return norm(canonBossName(label, { forChest: true }));
}

/**
 * Build chest pool from:
 *   1) state.options.chestBosses (string[]), or
 *   2) unique bosses on the current board
 * and collapse ED1/2/3 -> ED.
 */
export async function chestBossPoolForGuild(guildId: string): Promise<Map<string, string>> {
  const s = await load(guildId);
  const pool = new Map<string, string>();

  const configured = (s.options as any)?.chestBosses as string[] | undefined;
  const source: string[] =
    Array.isArray(configured) && configured.length > 0
      ? configured
      : Object.values(s.tiles || {})
          .map((t: any) => t?.boss)
          .filter(Boolean) as string[];

  for (const b of source) {
    const n = normalizedForChest(b);
    const display = n === "ed" ? "ED" : canonBossName(b, { forChest: true });
    if (!pool.has(n)) pool.set(n, display);
  }
  return pool;
}

/*
  The canonical set of bosses that require chest verification for most bingos.
  Keep this list modest — servers can override by setting s.options.chestBosses.
  Labels here are canonical display names; we normalize for comparison below.
*/
const REQUIRED_CHEST_BOSSES = [
  "Amascut the Devourer",
  "Arch-Glacor",
  "ED",
  "Telos, the Warden",
  "TzKal-Zuk",
  "Zemouregal and Vorkath",
  "Gate of Elidinis",
  "Sanctum of Rebirth",
  "Zamorak, Lord of Chaos",
];

function requiredChestNormalizedSet(): Set<string> {
  const out = new Set<string>();
  for (const lab of REQUIRED_CHEST_BOSSES) out.add(normalizedForChest(lab));
  return out;
}

/** Verified (by user) set of chest targets, normalized. Supports array<string> or { [boss]: true }. */
async function verifiedChestSet(guildId: string, userId: string): Promise<Set<string>> {
  const s = await load(guildId);
  const out = new Set<string>();
  const v = (s as any).chestVerifiedUsers?.[userId];

  if (!v) return out;

  if (Array.isArray(v)) {
    for (const item of v) if (typeof item === "string") out.add(normalizedForChest(item));
  } else if (typeof v === "object") {
    for (const [k, val] of Object.entries(v)) if (val) out.add(normalizedForChest(k));
  }
  return out;
}

/** Pending (by user) set of chest targets, normalized. */
async function pendingChestSet(guildId: string, userId: string): Promise<Set<string>> {
  const s = await load(guildId);
  const out = new Set<string>();

  for (const p of Object.values((s as any).pending || {})) {
    const kindRaw = (p as any).kind ?? (p as any).type ?? "";
    const kind = String(kindRaw).toLowerCase();
    if (!(kind.includes("chest"))) continue;

    const who = (p as any).userId ?? (p as any).user ?? (p as any).authorId;
    if (who !== userId) continue;

    const bossName =
      (p as any).boss ??
      (p as any).target ??
      (p as any).name ??
      (p as any).value ??
      (p as any).bossName;

    if (typeof bossName !== "string" || !bossName.trim()) continue;
    out.add(normalizedForChest(bossName));
  }
  return out;
}

/** Exportable helper so commands like /check_verify can reuse identical logic. */
export async function computeChestRemainingForUser(guildId: string, userId: string): Promise<string[]> {
  const s = await load(guildId);
  const pool = await chestBossPoolForGuild(guildId); // Map<normalized, display>
  if (pool.size === 0) return [];

  const configured = (s.options as any)?.chestBosses as string[] | undefined;
  const useConfiguredPoolAsRequired = Array.isArray(configured) && configured.length > 0;
  const required = requiredChestNormalizedSet();

  const verified = await verifiedChestSet(guildId, userId);
  const pending = await pendingChestSet(guildId, userId);

  const left: string[] = [];
  for (const [n, label] of pool) {
    if (!useConfiguredPoolAsRequired && !required.has(n)) continue;
    if (!verified.has(n) && !pending.has(n)) left.push(label);
  }
  return left.sort((a, b) => a.localeCompare(b));
}

/** Autocomplete for the `boss` option on chest verification. */
export async function suggestChestTargets(i: AutocompleteInteraction) {
  const remaining = await computeChestRemainingForUser(i.guildId!, i.user.id);
  const q = i.options.getFocused(true)?.value?.toString() ?? "";
  return toChoices(remaining, q);
}

// ... end of file
