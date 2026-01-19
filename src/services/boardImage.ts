// Array of boss names and aliases for tile display
export const BOSS_ALIASES: [string, string][] = [
  ["Vorago", ""],
  ["Solak", ""],
  ["The Barrows: Rise of the Six", "RoTS"],
  ["Araxxi", ""],
  ["Kalphite King", "KK"],
  ["Queen Black Dragon", "QBD"],
  ["Corporeal Beast", "Corp"],
  ["The Magister", ""],
  ["Raksha", ""],
  ["Zemouregal and Vorkath", "Vorkath"],
  ["Amascut the Devourer", "Amascut"],
  ["Nex Angel of Death", "AoD"],
  ["Nex", ""],
  ["K'ril Tsutsaroth", "Kril"],
  ["General Graardor", "Graardor"],
  ["Commander Zilyana", "Zilyana"],
  ["Kree'arra", "Kree"],
  ["GW1", ""],
  ["Telos, the Warden", "Telos"],
  ["GW2", ""],
  ["Gregorovic", ""],
  ["Twin Furies", "Furies"],
  ["Vindicta", ""],
  ["Helwyr", ""],
  ["Kerapac", ""],
  ["Arch-Glacor", "Arch-Glacor"],
  ["Croesus", ""],
  ["TzKal-Zuk", "Zuk"],
  ["ED1", ""],
  ["ED2", ""],
  ["ED3", ""],
  ["Zamorak", ""],
  ["Hermod", ""],
  ["Rasial", ""],
  ["Sanctum of Rebirth", "Sanctum"],
  ["Gate of Elidinis", "Gate"],
  ["Legiones", ""],
  ["Rex Matriarchs", "Matriarchs"],
  ["Dagannoth Kings", "DKs"],
  ["Kalphite Queen", "KQ"],
  ["Chaos Elemental", ""],
  ["King Black Dragon", "KBD"],
  ["Giant mole", "Mole"],
  ["Barrows brothers", "Barrows"],
];
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import fs from "fs";
import path from "path";
import { ICONS_DIR } from "../config.js";
import type { EventState } from "../state/types.js";
import { bossIconPath, normalize } from "../util.js";
// ESM-safe require for resolving package files
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const FONT_DIR = path.resolve(process.cwd(), "assets", "fonts");

// The names we’ll refer to in Canvas draws
export const FONT_REGULAR = "Truculenta-Regular";
export const FONT_BOLD = "Truculenta-SemiBold";

function registerFont(p: string, family: string) {
  try {
    const ok = GlobalFonts.registerFromPath(p, family);
    if (ok) {
      console.log(`[fonts] Registered ${family} from ${p}`);
    } else {
      console.warn(`[fonts] ${family} at ${p} was not registered (file missing or unsupported).`);
    }
  } catch (err) {
    console.warn(`[fonts] Failed to register ${family} at ${p}:`, err);
  }
}

// 1) Preferred: Noto Sans TTFs (add these files to assets/fonts)
registerFont(path.join(FONT_DIR, "Truculenta-Regular.ttf"), FONT_REGULAR);
registerFont(path.join(FONT_DIR, "Truculenta-SemiBold.ttf"), FONT_BOLD);
// Register Noto Sans (used for special glyphs like the hourglass symbol)
registerFont(path.join(FONT_DIR, "NotoSans-Bold.ttf"), "NotoSans-Bold");



function maxTiles(size: string) {
  if (size === "3x3") return 9; if (size === "4x4") return 16; if (size === "5x5") return 25; return 9;
}

export function tileComplete(state: EventState, team: string, idx: number): boolean {
  const cfg = state.tiles[idx];
  if (!cfg || !cfg.drops) return false;
  const prog = state.progress[team]?.[idx] ?? {};
  const checks = Object.entries(cfg.drops).map(([d, need]) => (prog[d] ?? 0) >= need);

  if (cfg.mode === "OR") return checks.some(Boolean);
  return checks.every(Boolean);
}

export function tilePending(state: EventState, team: string, idx: number): boolean {
  return Object.values(state.pending).some(p => p.kind === "drop" && p.team === team && (p as any).tile === idx);
}

function dropSummary(state: EventState, team: string, idx: number): string[] {
  const cfg = state.tiles[idx];
  if (!cfg || !cfg.drops) return [];
  const prog = state.progress[team]?.[idx] ?? {};
  return Object.entries(cfg.drops).map(([d, need]) => {
    const have = Math.min(prog[d] ?? 0, need);
    return `${d} ${have}/${need}`;
  });
}

export async function renderBoardImage(state: EventState, team: string): Promise<Buffer> {
  const side = parseInt(state.options.boardSize[0]);
  const cap = maxTiles(state.options.boardSize);

  const TILE = 220, GAP = 10, PAD = 16;
  const width = PAD*2 + side*TILE + (side-1)*GAP;
  const height = PAD*2 + side*TILE + (side-1)*GAP;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "top";
  ctx.font =  FONT_BOLD + " 22px";

  for (let r = 0; r < side; r++) {
    for (let c = 0; c < side; c++) {
      const idx = r*side + c + 1;
      if (idx > cap) continue;

      const x = PAD + c*(TILE + GAP);
      const y = PAD + r*(TILE + GAP);

      ctx.fillStyle = "#2b2d31";
      ctx.fillRect(x, y, TILE, TILE);

      const cfg = state.tiles[idx];
      if (!cfg?.boss) {
  ctx.fillStyle = "#9ca3af";
  ctx.font = FONT_BOLD + " 24px";
  ctx.textAlign = "center";
  ctx.fillText(`Tile ${idx}`, x + TILE/2, y + 20);
  ctx.font = "16px " + FONT_REGULAR;
  ctx.fillText(`(empty)`, x + TILE/2, y + 50);
  ctx.textAlign = "left";
        continue;
      }

      let iconPath = bossIconPath(cfg.boss);
      if (!fs.existsSync(iconPath)) {
        const simplified = normalize(cfg.boss).replace(/[^a-z0-9]+/g, "_");
        iconPath = path.join(ICONS_DIR, `${simplified}.png`);
      }
      try {
  const img = await loadImage(iconPath);
  const iw = img.width, ih = img.height;
  // Calculate scale to fit both width and height
  const scale = Math.min(TILE / iw, TILE / ih);
  const drawW = iw * scale;
  const drawH = ih * scale;
  // Center the image in the tile
  const dx = x + (TILE - drawW) / 2;
  const dy = y + (TILE - drawH) / 2;
  ctx.drawImage(img, 0, 0, iw, ih, dx, dy, drawW, drawH);
      } catch {
        ctx.fillStyle = "#3b3e45";
        ctx.fillRect(x, y, TILE, TILE);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = FONT_BOLD + " 20px";
  ctx.textAlign = "center";
  ctx.fillText("No Icon", x + TILE/2, y + TILE/2 - 10);
  ctx.textAlign = "left";
      }

  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x, y, TILE, 36);
  ctx.fillStyle = "#ffffff";
  ctx.font = FONT_BOLD + " 20px";
  ctx.textAlign = "center";
  // Use alias if available
  let bossLabel = cfg.boss;
  const aliasEntry = BOSS_ALIASES.find(([name]) => name === cfg.boss);
  if (aliasEntry && aliasEntry[1]) bossLabel = aliasEntry[1];
  ctx.fillText(`${idx}. ${bossLabel}`, x + TILE/2, y + 7);
  ctx.textAlign = "left";

      const lines = dropSummary(state, team, idx);
  const stripH = Math.min(60, 16 + lines.length*18);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(x, y + TILE - stripH, TILE, stripH);
  // Draw border around each tile
  ctx.save();
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, TILE, TILE);
  ctx.restore();
      ctx.fillStyle = "#e5e7eb";
      ctx.font = FONT_REGULAR + " 14px";
  ctx.textAlign = "center";
  lines.slice(0,3).forEach((t, i) => {
    const displayText = i === 0 && cfg.mode === "OR" ? t + " OR" : t;
    ctx.fillText(displayText, x + TILE/2, y + TILE - stripH + 8 + i*18);
  });
  if (lines.length > 3) ctx.fillText(`+${lines.length-3} more...`, x + TILE/2, y + TILE - 22);
  ctx.textAlign = "left";

      const complete = tileComplete(state, team, idx);
      const pending = tilePending(state, team, idx);
      if (complete) {
        // Large green tick centered in the tile
        ctx.save();
        // soft circular backfill to make the check visible over icons
        const radius = Math.round(TILE * 0.28);
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#00c864"; // green backfill
        ctx.beginPath();
        ctx.arc(x + TILE / 2, y + TILE / 2, radius, 0, Math.PI * 2);
        ctx.fill();

  // White checkmark centered (drawn as a path so we don't rely on font glyphs)
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(6, Math.round(radius * 0.18));
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  // points relative to circle radius
  const startX = cx - radius * 0.35;
  const startY = cy - radius * 0.05;
  const midX = cx - radius * 0.05;
  const midY = cy + radius * 0.28;
  const endX = cx + radius * 0.50;
  const endY = cy - radius * 0.35;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(midX, midY);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.restore();
      } else if (pending) {
        // draw hourglass centered in the tile with dark backplate, using
        // separate strokes for each segment so it reads as an hourglass
        const ix = x + TILE / 2;
        const iy = y + TILE / 2;

        // hourglass geometry (slightly taller and wider for center)
        const W = 12; // half-width of cap/base
        const capY = iy - 12;
        const baseY = iy + 12;

        const leftCap = { x: ix - W, y: capY };
        const rightCap = { x: ix + W, y: capY };
        const leftBase = { x: ix - W, y: baseY };
        const rightBase = { x: ix + W, y: baseY };

        // backplate first
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.beginPath();
        ctx.arc(ix, iy, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = "#ff9f1a"; // orange
        ctx.lineWidth = 3;
        ctx.lineCap = "round";

        // cap line (separate stroke)
        ctx.beginPath();
        ctx.moveTo(leftCap.x, leftCap.y);
        ctx.lineTo(rightCap.x, rightCap.y);
        ctx.stroke();

        // base line
        ctx.beginPath();
        ctx.moveTo(leftBase.x, leftBase.y);
        ctx.lineTo(rightBase.x, rightBase.y);
        ctx.stroke();

        // diagonal left cap -> right base
        ctx.beginPath();
        ctx.moveTo(leftCap.x, leftCap.y);
        ctx.lineTo(rightBase.x, rightBase.y);
        ctx.stroke();

        // diagonal right cap -> left base
        ctx.beginPath();
        ctx.moveTo(rightCap.x, rightCap.y);
        ctx.lineTo(leftBase.x, leftBase.y);
        ctx.stroke();
      }
    }
  }

  return canvas.toBuffer("image/png");
}
