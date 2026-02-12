import { AttachmentBuilder, SlashCommandBuilder } from "discord.js";
import { embed } from "../../util.js";
import { load } from "../../state/store.js";
import { renderBoardImage } from "../../services/boardImage.js";
export const data = new SlashCommandBuilder()
    .setName("check")
    .setDescription("Show your team's board as an image");
export async function execute(i) {
    const s = await load(i.guildId);
    if (!s.active)
        return i.reply({ embeds: [embed("No Active Bingo")], ephemeral: true });
    const team = s.channelToTeam[i.channelId];
    if (!team)
        return i.reply({ embeds: [embed("Wrong Channel", "Run this in your team's input channel.")], ephemeral: true });
    const img = await renderBoardImage(s, team);
    const file = new AttachmentBuilder(img, { name: "board.png" });
    const pending = Object.values(s.pending).filter(p => p.kind === "drop" && p.team === team);
    const lines = pending.map(p => `• Tile ${p.tile} — **${p.drop}** *(pending)*`);
    const extra = lines.length ? "\n\n**Pending:**\n" + lines.slice(0, 10).join("\n") + (lines.length > 10 ? `\n+${lines.length - 10} more…` : "") : "";
    await i.reply({
        embeds: [embed(`Team ${team} — Board ${s.options.boardSize}`, extra)],
        files: [file],
        ephemeral: true
    });
}
