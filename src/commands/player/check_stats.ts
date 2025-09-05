import { ChatInputCommandInteraction, SlashCommandBuilder, userMention } from "discord.js";
import { load } from "../../state/store.js";
import { embed } from "../../util.js";

export const data = new SlashCommandBuilder()
  .setName("check_stats")
  .setDescription("List all drops a player has submitted")
  .addUserOption(o => o.setName("player").setDescription("Player to inspect").setRequired(true));

export async function execute(i: ChatInputCommandInteraction) {
  const s = await load(i.guildId!);
  if (!s.active || !s.options.trackPlayerStats) {
    return i.reply({ embeds: [embed("Stats Disabled","Player stats are not enabled for this bingo.")], ephemeral: true });
  }
  const user = i.options.getUser("player", true);
  const entries = s.stats.filter(x => x.userId === user.id);
  if (entries.length === 0) {
    return i.reply({ embeds: [embed("No Stats", `${userMention(user.id)} hasn't submitted any drops.`)], ephemeral: true });
  }
  const lines = entries
    .sort((a,b)=>a.ts-b.ts)
    .slice(-25)
    .map(x => `• [T${x.tile}] ${x.boss} — **${x.drop}** x${x.amount}`);
  await i.reply({ embeds: [embed("Player Stats", `${userMention(user.id)}\n\n${lines.join("\n")}`)] });
}
