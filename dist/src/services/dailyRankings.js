import cron from "node-cron";
import { load } from "../state/store.js";
import { embed } from "../util.js";
function tileComplete(s, team, idx) {
    const cfg = s.tiles[idx];
    if (!cfg)
        return false;
    const prog = s.progress[team]?.[idx] ?? {};
    const checks = Object.entries(cfg.drops ?? {}).map(([d, need]) => (prog[d] ?? 0) >= need);
    if (cfg.mode === "OR")
        return checks.some(Boolean);
    return checks.every(Boolean);
}
function countPartial(s, team) {
    let count = 0;
    for (const [idxStr, cfg] of Object.entries(s.tiles)) {
        const idx = Number(idxStr);
        if (!cfg?.drops)
            continue;
        const prog = s.progress[team]?.[idx] ?? {};
        const hasAny = Object.keys(cfg.drops).some(d => (prog[d] ?? 0) > 0);
        const comp = tileComplete(s, team, idx);
        if (hasAny && !comp)
            count++;
    }
    return count;
}
export function scheduleDailyRankings(client) {
    cron.schedule("0 12 * * *", async () => {
        for (const guild of client.guilds.cache.values()) {
            const s = await load(guild.id);
            if (!s.active || !s.options.dailyUpdates || !s.announcementsChannelId)
                continue;
            const ann = guild.channels.cache.get(s.announcementsChannelId);
            if (!ann)
                continue;
            const teams = Object.keys(s.teamToChannel);
            const rows = teams.map(t => {
                let full = 0;
                for (const iStr of Object.keys(s.tiles))
                    if (tileComplete(s, t, Number(iStr)))
                        full++;
                const partial = countPartial(s, t);
                return { t, full, partial };
            }).sort((a, b) => b.full - a.full || b.partial - a.partial);
            const lines = rows.map((r, idx) => `${idx + 1}. Team **${r.t}** — **${r.full}** tiles complete, **${r.partial}** partial`);
            await ann.send({ embeds: [embed("Daily Rankings", lines.join("\n"))] });
        }
    }, { timezone: "Etc/UTC" });
}
