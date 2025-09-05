export const DATA_DIR = "./data";
export const CONFIG_DIR = "./config";
export const ASSETS_DIR = "./assets";
export const ICONS_DIR = `${ASSETS_DIR}/icons`;

export const AMOUNTABLE_DROPS = new Set([
  "vorkath's spike",
  "ancient scale (cumulative)"
]);

// Chest-verify bosses (ED1/2/3 collapsed to "ED")
export const CHEST_VERIFY_BOSSES = [
  "Zemouregal and Vorkath",
  "Amascut the Devourer",
  "Arch-Glacor",
  "TzKal-Zuk",
  "ED",
  "Zamorak",
  "Sanctum of Rebirth",
  "Gate of Elidinis"
];

// Reactions used in /bingo_create
export const REACTIONS = {
  size3: "3️⃣",
  size4: "4️⃣",
  size5: "5️⃣",
  toggleDaily: "📅",
  toggleChest: "🔐",
  toggleCheckTeams: "👀",
  toggleFirstLine: "🟩",
  togglePlayerStats: "📊",
  confirm: "✅"
} as const;

export type BoardSize = "3x3" | "4x4" | "5x5";

export const BOARD_SIZES: Record<string, BoardSize> = {
  [REACTIONS.size3]: "3x3",
  [REACTIONS.size4]: "4x4",
  [REACTIONS.size5]: "5x5",
};

export const MAX_TILES: Record<BoardSize, number> = { "3x3": 9, "4x4": 16, "5x5": 25 };

export const COLORS = {
  info: 0x5865F2,
  ok: 0x57F287,
  warn: 0xFEE75C,
  err: 0xED4245,
  pending: 0xF4900C
};
