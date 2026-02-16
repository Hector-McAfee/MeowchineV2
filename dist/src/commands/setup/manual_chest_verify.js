import { PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
import { load, save } from "../../state/store.js";
import { embed, isAdmin } from "../../util.js";
import { canonBossName, chestBossPoolForGuild } from "../../autocomplete/data.js";
export const data = new SlashCommandBuilder()
    .setName("manual_chest_verify")
    .setDescription("Manually verify a player's chest boss and clear stuck pending entries (admin)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((o) => o.setName("player").setDescription("Player to verify chest for").setRequired(true))
    .addStringOption((o) => o
    .setName("boss")
    .setDescription("Chest boss to mark as verified")
    .setRequired(true)
    .setAutocomplete(true));
export async function execute(i) {
    if (!isAdmin(i.member)) {
        return i.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
    }
    const s = await load(i.guildId);
    if (!s.active) {
        return i.reply({ embeds: [embed("No Active Bingo", "Create a bingo first with /bingo_create")], ephemeral: true });
    }
    if (!s.options?.chestVerify) {
        return i.reply({ embeds: [embed("Chest Verify Disabled", "This bingo isn't configured for chest verification.")], ephemeral: true });
    }
    const player = i.options.getUser("player", true);
    const bossRaw = i.options.getString("boss", true);
    const norm = canonBossName(bossRaw, { forChest: true }).toLowerCase();
    if (!norm) {
        return i.reply({ embeds: [embed("Invalid Boss", "Please provide a valid chest boss.")], ephemeral: true });
    }
    const pool = await chestBossPoolForGuild(i.guildId);
    const bossDisplay = pool.get(norm) ?? (norm === "ed" ? "ED" : canonBossName(bossRaw, { forChest: true }));
    const verified = new Set(s.chestVerifiedUsers[player.id] ?? []);
    verified.add(bossDisplay);
    s.chestVerifiedUsers[player.id] = Array.from(verified).sort((a, b) => a.localeCompare(b));
    let removedPending = 0;
    for (const [messageId, p] of Object.entries(s.pending || {})) {
        if (p.kind !== "chest")
            continue;
        if (p.userId !== player.id)
            continue;
        const pBoss = String(p.boss ?? "");
        const pNorm = canonBossName(pBoss, { forChest: true }).toLowerCase();
        if (pNorm !== norm)
            continue;
        delete s.pending[messageId];
        removedPending += 1;
    }
    await save(i.guildId, s);
    return i.reply({
        embeds: [
            embed("Manual Chest Verification Applied", [
                `Player: <@${player.id}>`,
                `Boss: **${bossDisplay}**`,
                `Removed pending entries: **${removedPending}**`,
            ].join("\n")),
        ],
        ephemeral: true,
    });
}
