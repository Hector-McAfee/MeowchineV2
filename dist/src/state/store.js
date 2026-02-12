import fs from "fs";
import path from "path";
import { ensureDir } from "../util.js";
import { DATA_DIR } from "../config.js";
ensureDir(DATA_DIR);
const guildPath = (gid) => path.join(DATA_DIR, `${gid}.json`);
export async function load(guildId) {
    const p = guildPath(guildId);
    try {
        await fs.promises.access(p);
    }
    catch {
        return {
            active: false,
            started: false,
            verificationOpen: false,
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
    return JSON.parse(raw);
}
export async function save(guildId, state) {
    await fs.promises.writeFile(guildPath(guildId), JSON.stringify(state, null, 2), "utf8");
}
