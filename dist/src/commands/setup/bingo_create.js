import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { embed, isAdmin } from "../../util.js";
import { startBingoCreateSession } from "../../services/reactionConfig.js";
export const data = new SlashCommandBuilder()
    .setName("bingo_create")
    .setDescription("Create a new Bingo via reactions (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
export async function execute(interaction) {
    if (!isAdmin(interaction.member)) {
        return interaction.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
    }
    await interaction.reply({ embeds: [embed("Bingo Setup", "Starting setup…")], ephemeral: true });
    if (interaction.channel &&
        "send" in interaction.channel &&
        typeof interaction.channel.send === "function") {
        const msg = await interaction.channel.send({ embeds: [embed("Bingo Setup", "React on the message to configure.")] });
        await startBingoCreateSession(interaction.client, msg);
    }
    else {
        await interaction.followUp({ embeds: [embed("Error", "Cannot send message in this channel.")], ephemeral: true });
    }
}
