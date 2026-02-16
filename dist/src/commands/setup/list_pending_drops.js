import { EmbedBuilder, PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
import { load, save } from "../../state/store.js";
import { embed, isAdmin } from "../../util.js";
export const data = new SlashCommandBuilder()
    .setName("list_pending_drops")
    .setDescription("Repost all pending drop submissions in the admin/output channel for normal verification")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
export async function execute(i) {
    if (!isAdmin(i.member)) {
        return i.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
    }
    const s = await load(i.guildId);
    if (!s.active) {
        return i.reply({ embeds: [embed("No Active Bingo", "Create a bingo first with /bingo_create")], ephemeral: true });
    }
    const outCh = s.outputChannelId
        ? i.guild.channels.cache.get(s.outputChannelId)
        : undefined;
    if (!outCh) {
        return i.reply({ embeds: [embed("No Output Channel", "Ask an admin to run /set_output first.")], ephemeral: true });
    }
    const pendingDrops = Object.entries(s.pending || {})
        .filter(([, p]) => p.kind === "drop")
        .map(([messageId, p]) => ({
        messageId,
        pending: p,
        team: String(p.team ?? "?"),
        tile: Number(p.tile ?? 0),
        drop: String(p.drop ?? ""),
    }))
        .sort((a, b) => {
        if (a.team !== b.team)
            return a.team.localeCompare(b.team, undefined, { numeric: true });
        if (a.tile !== b.tile)
            return a.tile - b.tile;
        return a.drop.localeCompare(b.drop);
    });
    if (pendingDrops.length === 0) {
        await outCh.send({ embeds: [embed("Pending Drops", "✅ There are no pending drop submissions.")] });
        return i.reply({ embeds: [embed("Posted", `No pending drops found. Posted status in <#${outCh.id}>.`)], ephemeral: true });
    }
    let reposted = 0;
    let failed = 0;
    for (const item of pendingDrops) {
        try {
            const oldMessage = await outCh.messages.fetch(item.messageId).catch(() => null);
            const baseEmbed = oldMessage?.embeds?.[0]
                ? EmbedBuilder.from(oldMessage.embeds[0])
                : embed("Drop Submission", `**Team ${item.pending.team}** submitted **${item.pending.drop}** from **${item.pending.boss}** *(pending)*`);
            const repost = await outCh.send({ embeds: [baseEmbed] });
            await repost.react("✅").catch(() => { });
            await repost.react("❌").catch(() => { });
            delete s.pending[item.messageId];
            s.pending[repost.id] = {
                ...item.pending,
                outputMessageId: repost.id,
            };
            reposted += 1;
        }
        catch {
            failed += 1;
        }
    }
    await save(i.guildId, s);
    return i.reply({
        embeds: [
            embed("Pending Drops Reposted", `Reposted **${reposted}** pending drop(s) in <#${outCh.id}>.` +
                (failed > 0 ? `\nFailed to repost **${failed}** pending drop(s).` : "")),
        ],
        ephemeral: true,
    });
}
