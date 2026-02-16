import { SlashCommandBuilder } from "discord.js";
import { load } from "../../state/store.js";
import { embed } from "../../util.js";
import { canonBossName, computeChestRemainingForUser } from "../../autocomplete/data.js";
export const data = new SlashCommandBuilder()
    .setName("check_verify")
    .setDescription("See which chests you still need to verify");
export async function execute(i) {
    const s = await load(i.guildId);
    if (!s.active)
        return i.reply({ embeds: [embed("No Active Bingo")], ephemeral: true });
    if (!s.options.chestVerify)
        return i.reply({ embeds: [embed("Chest Verification", "Disabled for this bingo.")], ephemeral: true });
    const team = s.channelToTeam[i.channelId];
    if (!team)
        return i.reply({ embeds: [embed("Wrong Channel", "Run this in your team input channel.")], ephemeral: true });
    const missing = await computeChestRemainingForUser(i.guildId, i.user.id);
    const pend = Object.values(s.pending)
        .filter((p) => p.kind === "chest" && p.team === team && p.userId === i.user.id)
        .map((p) => {
        const boss = String(p.boss ?? "").trim();
        return canonBossName(boss, { forChest: true }) || boss;
    })
        .filter((x) => !!x);
    const lines = [];
    if (missing.length)
        lines.push("**Still need:**", ...missing.map(m => `• ${m}`));
    if (pend.length) {
        if (lines.length)
            lines.push("");
        lines.push("**Pending:**", ...pend.map(m => `• ${m}`));
    }
    if (lines.length === 0)
        lines.push("✅ You’ve verified all required bosses.");
    await i.reply({ embeds: [embed("Your Chest Verification", lines.join("\n"))], ephemeral: true });
}
