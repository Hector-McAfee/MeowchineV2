import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { load } from "../../state/store.js";
import { buildDailyRankingsLines } from "../../services/dailyRankings.js";
import { embed, isAdmin } from "../../util.js";
export const data = new SlashCommandBuilder()
    .setName("rankings")
    .setDescription("Manually post the daily rankings snapshot")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
export async function execute(i) {
    if (!isAdmin(i.member)) {
        return i.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
    }
    const s = await load(i.guildId);
    if (!s.active) {
        return i.reply({ embeds: [embed("No Active Bingo", "Create a bingo first with /bingo_create")], ephemeral: true });
    }
    const lines = buildDailyRankingsLines(s);
    if (lines.length === 0) {
        return i.reply({ embeds: [embed("Daily Rankings", "No teams are configured yet.")], ephemeral: true });
    }
    return i.reply({ embeds: [embed("Daily Rankings", lines.join("\n"))] });
}
