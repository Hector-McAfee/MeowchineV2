import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { embed, isAdmin } from "../../util.js";
import { load, save } from "../../state/store.js";

export const set_output = new SlashCommandBuilder()
  .setName("set_output")
  .setDescription("Set current channel as the admin output/verification channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const set_announcments = new SlashCommandBuilder()
  .setName("set_announcments")
  .setDescription("Set current channel as the announcements channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const set_input = new SlashCommandBuilder()
  .setName("set_input")
  .setDescription("Bind this channel to a team number")
  .addIntegerOption(o => o.setName("team").setDescription("Team number").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function exec_set_output(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) return i.reply({ embeds: [embed("Admin Only","No permission.")], ephemeral: true });
  const s = await load(i.guildId!);
  s.outputChannelId = i.channelId;
  await save(i.guildId!, s);
  await i.reply({ embeds: [embed("Output Channel Set", "This channel is now the verification/output channel.")]});
}

export async function exec_set_announcments(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) return i.reply({ embeds: [embed("Admin Only","No permission.")], ephemeral: true });
  const s = await load(i.guildId!);
  s.announcementsChannelId = i.channelId;
  await save(i.guildId!, s);
  await i.reply({ embeds: [embed("Announcements Channel Set", "This channel will be used for announcements.")]});
}

export async function exec_set_input(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) return i.reply({ embeds: [embed("Admin Only","No permission.")], ephemeral: true });
  const team = i.options.getInteger("team", true).toString();
  const s = await load(i.guildId!);
  s.teamToChannel[team] = i.channelId;
  s.channelToTeam[i.channelId] = team;
  s.progress[team] ??= {};
  await save(i.guildId!, s);
  await i.reply({ embeds: [embed("Team Channel Set", `This channel is now Team **${team}**'s input channel.`)]});
}
