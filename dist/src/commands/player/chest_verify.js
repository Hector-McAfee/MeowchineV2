import { SlashCommandBuilder, } from "discord.js";
import { load, save } from "../../state/store.js";
import { embed } from "../../util.js";
import { COLORS } from "../../config.js";
import { chestBossPoolForGuild, canonBossName } from "../../autocomplete/data.js";
export const data = new SlashCommandBuilder()
    .setName("chest_verify")
    .setDescription("Submit chest verification for a boss")
    .addStringOption((o) => o
    .setName("boss")
    .setDescription("Boss requiring chest verification")
    .setRequired(true)
    .setAutocomplete(true))
    .addAttachmentOption((o) => o.setName("image").setDescription("Proof image").setRequired(true));
export async function execute(i) {
    const s = await load(i.guildId);
    if (!s.active) {
        return i.reply({ embeds: [embed("No Active Bingo")], ephemeral: true });
    }
    if (!s.options.chestVerify) {
        return i.reply({ embeds: [embed("Chest Verify Disabled", "Admins disabled chest verification for this bingo.")], ephemeral: true });
    }
    if (!s.started && !s.verificationOpen) {
        return i.reply({ embeds: [embed("Chest Verification Not Open", "Admins can run `/open_verification` to allow chest verification before bingo starts.")], ephemeral: true });
    }
    const team = s.channelToTeam[i.channelId];
    if (!team) {
        return i.reply({
            embeds: [
                embed("Wrong Channel", "Run this in your team input channel."),
            ],
            ephemeral: true,
        });
    }
    const bossLabel = i.options.getString("boss", true); // Display label from autocomplete (e.g., "ED", "Amascut the Devourer")
    const image = i.options.getAttachment("image", true);
    // Build the allowed chest pool for this guild and normalize the selection.
    const pool = await chestBossPoolForGuild(i.guildId); // Map<normalizedKey, displayLabel>
    const normKey = canonBossName(bossLabel, { forChest: true }).toLowerCase();
    if (!pool.has(normKey)) {
        // Not a valid chest target for this bingo
        return i.reply({
            embeds: [
                embed("Invalid Boss", "This boss is not required for chest verification in this bingo."),
            ],
            ephemeral: true,
        });
    }
    // Compute verified & pending sets normalized for THIS user
    const verifiedSet = new Set((s.chestVerifiedUsers?.[i.user.id] ?? [])
        .filter((x) => typeof x === "string")
        .map((x) => canonBossName(x, { forChest: true }).toLowerCase()));
    if (verifiedSet.has(normKey)) {
        return i.reply({
            embeds: [embed("Already Verified", `**${pool.get(normKey)}** is already verified for you.`)],
            ephemeral: true,
        });
    }
    const pendingSet = new Set();
    for (const p of Object.values(s.pending || {})) {
        const kind = String(p.kind ?? "").toLowerCase();
        if (!kind.includes("chest"))
            continue;
        const who = p.userId ?? p.createdBy ?? p.user;
        if (who !== i.user.id)
            continue;
        const pboss = p.boss ??
            p.target ??
            p.name ??
            p.value ??
            p.bossName;
        if (typeof pboss !== "string" || !pboss.trim())
            continue;
        const n = canonBossName(pboss, { forChest: true }).toLowerCase();
        pendingSet.add(n);
    }
    if (pendingSet.has(normKey)) {
        return i.reply({
            embeds: [
                embed("Already Pending", `You already have a pending chest verification for **${pool.get(normKey)}**.`),
            ],
            ephemeral: true,
        });
    }
    // Output / admin review channel
    const outCh = s.outputChannelId
        ? i.guild.channels.cache.get(s.outputChannelId)
        : undefined;
    if (!outCh) {
        return i.reply({
            embeds: [embed("No Output Channel", "Ask an admin to /set_output")],
            ephemeral: true,
        });
    }
    const display = i.member?.displayName || i.user.username;
    const bossDisplay = pool.get(normKey); // canonical display to store & show
    const desc = `**Team ${team}** · **${display}** submitted chest verification for **${bossDisplay}** *(pending)*`;
    const base = embed("Chest Verification", desc, COLORS.warn)
        .setImage(image.url)
        .setFooter({ text: `Submitted by ${display}` });
    const teamMsg = await i.channel.send({ embeds: [base] });
    const outMsg = await outCh.send({ embeds: [base] });
    await outMsg.react("✅").catch(() => { });
    await outMsg.react("❌").catch(() => { });
    // Store a single canonical label in state (so admin approve writes back consistently)
    s.pending[outMsg.id] = {
        kind: "chest",
        guildId: i.guildId,
        team,
        submitChannelId: i.channelId,
        teamMessageId: teamMsg.id,
        outputMessageId: outMsg.id,
        imageUrl: image.url,
        createdBy: i.user.id,
        userId: i.user.id,
        boss: bossDisplay, // store canonical display (ED, Amascut the Devourer, etc)
    };
    await save(i.guildId, s);
    await i.reply({
        embeds: [embed("Queued", "Forwarded to admins for verification.")],
        ephemeral: true,
    });
}
