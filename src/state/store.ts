import fs from "fs";
import path from "path";
import { ensureDir } from "../util.js";
import { DATA_DIR } from "../config.js";
import type { EventState } from "./types.js";

ensureDir(DATA_DIR);

const guildPath = (gid: string) => path.join(DATA_DIR, `${gid}.json`);

export async function load(guildId: string): Promise<EventState> {
  const p = guildPath(guildId);
  try {
    await fs.promises.access(p);
  } catch {
    return {
      active: false,
      started: false,
      options: {
        boardSize: "3x3",
        dailyUpdates: false,
        chestVerify: false,
        allowPlayersCheckTeams: false,
        trackFirstLine: false,
        trackPlayerStats: false,
      },
      teamToChannel: {},
      channelToTeam: {},
      tiles: {},
      progress: {},
      pending: {},
      chestVerifiedUsers: {},
      placements: [],
      stats: [],
      channels: {},
    };
  }

  const raw = await fs.promises.readFile(p, "utf8");
  return JSON.parse(raw) as EventState;
}

export async function save(guildId: string, state: EventState): Promise<void> {
  await fs.promises.writeFile(guildPath(guildId), JSON.stringify(state, null, 2), "utf8");
}
