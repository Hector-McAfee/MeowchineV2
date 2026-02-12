import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { embed, isAdmin } from "../../util.js";
import { load, save } from "../../state/store.js";
export const data = new SlashCommandBuilder()
    .setName("start_bingo")
    .setDescription("Start accepting drop submissions (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
export async function execute(i) {
    if (!isAdmin(i.member)) {
        return i.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
    }
    const s = await load(i.guildId);
    if (!s.active) {
        return i.reply({ embeds: [embed("No Active Bingo", "Create a bingo first with /bingo_create")], ephemeral: true });
    }
    if (s.started) {
        return i.reply({ embeds: [embed("Already Started", "Bingo is already started.")], ephemeral: true });
    }
    s.started = true;
    s.verificationOpen = false; // close pre-start verification window when bingo starts
    await save(i.guildId, s);
    if (s.announcementsChannelId) {
        try {
            const ch = i.guild.channels.cache.get(s.announcementsChannelId);
            if (ch && 'send' in ch) {
                await ch.send({ embeds: [embed("Bingo Started ✅", "Drop submissions are now open!")] });
            }
        }
        catch (e) {
            // ignore announcement failures
        }
    }
    return i.reply({ embeds: [embed("Bingo Started", "Drop submissions are now open.")] });
}
