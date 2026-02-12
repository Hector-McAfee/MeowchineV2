import { ChatInputCommandInteraction, SlashCommandBuilder, Attachment, EmbedBuilder, TextChannel, GuildMember } from "discord.js";
import { AMOUNTABLE_DROPS, COLORS } from "../../config.js";
import { embed, normalize } from "../../util.js";
import { load, save } from "../../state/store.js";
import { computeChestRemainingForUser } from "../../autocomplete/data.js";

export const data = new SlashCommandBuilder()
  .setName("submit_drop")
  .setDescription("Submit a drop for verification")
  .addStringOption(o => o.setName("boss").setDescription("Boss").setRequired(true))
  .addStringOption(o => o.setName("drop").setDescription("Drop").setRequired(true))
  .addIntegerOption(o => o.setName("amount").setDescription("Amount (Vorkath's spike / Ancient scale only)").setRequired(false))
  .addAttachmentOption(o => o.setName("image").setDescription("Proof image").setRequired(true));

export async function execute(i: ChatInputCommandInteraction) {
  const s = await load(i.guildId!);
  if (!s.active) return i.reply({ embeds: [embed("No Active Bingo")], ephemeral: true });
  if (!s.started) return i.reply({ embeds: [embed("Bingo Hasn't Started", "Admins must run `/start_bingo` to begin accepting drop submissions.")], ephemeral: true });

  const team = s.channelToTeam[i.channelId];
  if (!team) return i.reply({ embeds: [embed("Wrong Channel","Run this in your team input channel.")], ephemeral: true });

  if (s.options.chestVerify) {
    const missing = await computeChestRemainingForUser(i.guildId!, i.user.id);
    if (missing.length > 0) {
      return i.reply({ embeds: [embed("Chest Verification Required",
        "You must verify these before submitting drops:\n" + missing.map(m => `• ${m}`).join("\n")
      , COLORS.warn)], ephemeral: true });
    }
  }

  const boss = i.options.getString("boss", true);
  const drop = i.options.getString("drop", true);
  const image = i.options.getAttachment("image", true) as Attachment;
  const amount = i.options.getInteger("amount") ?? 1;

  let matchTile = -1, target = 0, current = 0;
  (Object.entries(s.tiles)).some(([idxStr, cfg]) => {
    const idx = Number(idxStr);
    if (cfg?.boss?.toLowerCase() === boss.toLowerCase() && cfg.drops[drop] != null) {
      matchTile = idx;
      target = cfg.drops[drop];
      current = s.progress[team]?.[idx]?.[drop] ?? 0;
      return true;
    }
    return false;
  });

  if (matchTile === -1) return i.reply({ embeds: [embed("Not Configured", "That boss/drop isn't configured yet.")], ephemeral: true });
  if (current >= target) return i.reply({ embeds: [embed("Already Complete", "This drop is already completed for your team.")], ephemeral: true });

  const delta = (amount > 1 && AMOUNTABLE_DROPS.has(normalize(drop))) ? Math.min(amount, 1_000_000) : 1;
  const proposed = Math.min(current + delta, target);

  const outCh = s.outputChannelId ? i.guild!.channels.cache.get(s.outputChannelId) as TextChannel : undefined;
  if (!outCh) return i.reply({ embeds: [embed("No Output Channel","Ask an admin to **/set_output** here.")], ephemeral: true });

  const display = ((i.member as GuildMember | null)?.displayName) || i.user.username;

  const desc = `**Team ${team}** · **${display}** submitted **${drop}** from **${boss}**\n` +
               `Tile **${matchTile}** • Progress: **${proposed}/${target}** *(pending)*` +
               (delta !== 1 ? `\nAmount: **x${delta}**` : "");

  const base = new EmbedBuilder().setTitle("Drop Submission").setDescription(desc).setColor(COLORS.warn)
    .setImage(image.url).setFooter({ text: `Submitted by ${display}` });

  const teamMsg = await (i.channel as TextChannel).send({ embeds: [base] });

  const outMsg = await outCh.send({ embeds: [base] });
  await outMsg.react("✅").catch(()=>{});
  await outMsg.react("❌").catch(()=>{});

  s.pending[outMsg.id] = {
    kind: "drop",
    guildId: i.guildId!,
    team,
    submitChannelId: i.channelId,
    teamMessageId: teamMsg.id,
    outputMessageId: outMsg.id,
    imageUrl: image.url,
    createdBy: i.user.id,
    tile: matchTile,
    boss,
    drop,
    target,
    delta,
    snapshot: current
  };

  if (s.options.trackPlayerStats) {
    s.stats.push({ userId: i.user.id, team, tile: matchTile, boss, drop, amount: delta, ts: Date.now() });
  }

  await save(i.guildId!, s);
  await i.reply({ embeds: [embed("Queued", `Forwarded to admins for verification.`)], ephemeral: true });
}
