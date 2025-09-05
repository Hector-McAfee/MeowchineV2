import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { load } from "../../state/store.js";
import { embed } from "../../util.js";

export const data = new SlashCommandBuilder()
  .setName("check_verify")
  .setDescription("See which chests you still need to verify");

export async function execute(i: ChatInputCommandInteraction) {
  const s = await load(i.guildId!);
  if (!s.active) return i.reply({ embeds: [embed("No Active Bingo")], ephemeral: true });
  if (!s.options.chestVerify) return i.reply({ embeds: [embed("Chest Verification","Disabled for this bingo.")] , ephemeral: true });

  const team = s.channelToTeam[i.channelId];
  if (!team) return i.reply({ embeds: [embed("Wrong Channel","Run this in your team input channel.")], ephemeral: true });

  const required = new Set<string>();
  for (const t of Object.values(s.tiles)) {
    if (!t?.boss) continue;
    const b = t.boss.toLowerCase();
    if (["zemouregal and vorkath","amascut the devourer","arch-glacor","tzkal-zuk","ed","zamorak","sanctum of rebirth","gate of elidinis"].includes(b)) {
      required.add(t.boss);
    }
  }
  const done = new Set(s.chestVerifiedUsers[i.user.id] ?? []);
  const missing = [...required].filter(x => !done.has(x));

  const pend = Object.values(s.pending).filter(p => p.kind==="chest" && p.team===team && (p as any).userId===i.user.id).map(p => (p as any).boss);
  const lines: string[] = [];
  if (missing.length) lines.push("**Still need:**", ...missing.map(m => `• ${m}`));
  if (pend.length) { if (lines.length) lines.push(""); lines.push("**Pending:**", ...pend.map(m => `• ${m}`)); }
  if (lines.length === 0) lines.push("✅ You’ve verified all required bosses.");

  await i.reply({ embeds: [embed("Your Chest Verification", lines.join("\n"))], ephemeral: true });
}
