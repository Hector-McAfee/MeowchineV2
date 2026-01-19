import { ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { embed, isAdmin } from "../../util.js";
import { load, save } from "../../state/store.js";

export const data = new SlashCommandBuilder()
  .setName("open_verification")
  .setDescription("Allow chest verification submissions before bingo starts (admin)")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) {
    return i.reply({ embeds: [embed("Admin Only", "You don't have permission.")], ephemeral: true });
  }

  const s = await load(i.guildId!);
  if (!s.active) {
    return i.reply({ embeds: [embed("No Active Bingo", "Create a bingo first with /bingo_create")], ephemeral: true });
  }
  if (!s.options?.chestVerify) {
    return i.reply({ embeds: [embed("Chest Verify Disabled", "This bingo isn't configured for chest verification.")], ephemeral: true });
  }
  if (s.verificationOpen) {
    return i.reply({ embeds: [embed("Already Open", "Chest verification is already open.")], ephemeral: true });
  }

  s.verificationOpen = true;
  await save(i.guildId!, s);

  if (s.announcementsChannelId) {
    try {
      const ch = i.guild!.channels.cache.get(s.announcementsChannelId as string);
      if (ch && 'send' in ch) {
        await (ch as any).send({ embeds: [embed("Chest Verification Open ✅", "Players may now submit chest verification before bingo starts.")] });
      }
    } catch (e) {
      // ignore announcement failures
    }
  }

  return i.reply({ embeds: [embed("Verification Open", "Players can submit chest verification prior to bingo start.")] });
}
