import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { embed, isAdmin } from "../../util.js";
import { load, save } from "../../state/store.js";
export const data = new SlashCommandBuilder()
    .setName("end_bingo")
    .setDescription("End the bingo in the current guild (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
export async function execute(i) {
    if (!isAdmin(i.member)) {
        return i.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
    }
    const s = await load(i.guildId);
    if (!s.active) {
        return i.reply({ embeds: [embed("No Active Bingo", "No bingo is active in this guild.")], ephemeral: true });
    }
    s.active = false;
    s.started = false;
    s.verificationOpen = false;
    s.pending = {};
    await save(i.guildId, s);
    if (s.announcementsChannelId) {
        try {
            const ch = i.guild.channels.cache.get(s.announcementsChannelId);
            if (ch && 'send' in ch) {
                await ch.send({ embeds: [embed("Bingo Ended 🔚", "This bingo has been ended by an admin.")] });
            }
        }
        catch (e) {
            // ignore announcement failures
        }
    }
    return i.reply({ embeds: [embed("Bingo Ended", "Bingo has been ended and submissions are closed.")] });
}
