import { COLORS } from "../config.js";
import { embed } from "../util.js";
function maxTiles(size) { return size === "3x3" ? 9 : size === "4x4" ? 16 : size === "5x5" ? 25 : 36; }
function tileComplete(state, team, idx) {
    const cfg = state.tiles[idx];
    if (!cfg)
        return false;
    const prog = state.progress[team]?.[idx] ?? {};
    const checks = Object.entries(cfg.drops ?? {}).map(([d, need]) => (prog[d] ?? 0) >= need);
    if (cfg.mode === "OR")
        return checks.some(Boolean);
    return checks.every(Boolean);
}
export function checkAnyLineComplete(state, team) {
    const n = parseInt(state.options.boardSize[0]);
    const cap = maxTiles(state.options.boardSize);
    for (let r = 0; r < n; r++) {
        let ok = true;
        for (let c = 0; c < n; c++) {
            const idx = r * n + c + 1;
            if (idx > cap || !tileComplete(state, team, idx)) {
                ok = false;
                break;
            }
        }
        if (ok)
            return true;
    }
    for (let c = 0; c < n; c++) {
        let ok = true;
        for (let r = 0; r < n; r++) {
            const idx = r * n + c + 1;
            if (idx > cap || !tileComplete(state, team, idx)) {
                ok = false;
                break;
            }
        }
        if (ok)
            return true;
    }
    let okD1 = true, okD2 = true;
    for (let i = 0; i < n; i++) {
        const idx1 = i * n + i + 1;
        const idx2 = i * n + (n - 1 - i) + 1;
        if (idx1 > cap || !tileComplete(state, team, idx1))
            okD1 = false;
        if (idx2 > cap || !tileComplete(state, team, idx2))
            okD2 = false;
    }
    return okD1 || okD2;
}
export async function onBoardCompleteMaybeAnnounce(guild, state, team) {
    const n = parseInt(state.options.boardSize[0]);
    const cap = maxTiles(state.options.boardSize);
    let all = true;
    for (let i = 1; i <= cap; i++) {
        if (!tileComplete(state, team, i)) {
            all = false;
            break;
        }
    }
    if (!all)
        return;
    if (!state.placements.includes(team)) {
        state.placements.push(team);
        if (state.announcementsChannelId) {
            const ann = guild.channels.cache.get(state.announcementsChannelId);
            const players = new Set(state.stats.filter(s => s.team === team).map(s => s.userId));
            const place = state.placements.length;
            const placeStr = place === 1 ? "1st" : place === 2 ? "2nd" : place === 3 ? "3rd" : `${place}th`;
            await ann?.send({
                embeds: [embed("Board Complete 🏁", `Team **${team}** has completed the board!\n` +
                        `Players: ${Array.from(players).map(u => `<@${u}>`).join(", ") || "_n/a_"}\n` +
                        `Placement: **${placeStr}**`, COLORS.ok)]
            });
        }
    }
}
