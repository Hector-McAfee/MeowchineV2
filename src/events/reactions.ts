import { Client, MessageReaction, User, TextChannel, EmbedBuilder, GuildMember } from "discord.js";
import { load, save } from "../state/store.js";
import { COLORS } from "../config.js";
import { embed } from "../util.js";
import { onBoardCompleteMaybeAnnounce, checkAnyLineComplete } from "../logic/lineAndBoard.js";

export function wireReactionHandler(client: Client) {
  client.on("messageReactionAdd", async (reaction, user) => {
    try {
      if (user.partial) await user.fetch();
      if (reaction.partial) await reaction.fetch();
      if (user.bot) return;
      if (!reaction.message.guild) return;

  const guildId = reaction.message.guild.id;
  const state = await load(guildId);
      const emoji = reaction.emoji.name;
      if (emoji !== "✅" && emoji !== "❌") return;

      const pending = state.pending[reaction.message.id];
      if (!pending) return;

      const outCh = reaction.message.channel as TextChannel;

      const base = EmbedBuilder.from(reaction.message.embeds[0] ?? new EmbedBuilder());
      if (emoji === "✅") base.setColor(COLORS.ok).setDescription((base.data.description ?? "").replace(/\(pending\)/i, `**VERIFIED by ${user.username}**`));
      else base.setColor(COLORS.err).setDescription(`${base.data.description ?? ""}\n**DENIED by ${user.username}**`);
      await reaction.message.edit({ embeds: [base] }).catch(() => {});

      const teamCh = reaction.message.guild.channels.cache.get(pending.submitChannelId) as TextChannel | undefined;

      delete state.pending[reaction.message.id];

      if (pending.kind === "drop") {
        const { team, tile, drop, target, delta, snapshot } = pending as any;

        state.progress[team] ??= {};
        state.progress[team][tile] ??= {};
        const realCurrent = state.progress[team][tile][drop] ?? 0;

        if (emoji === "✅") {
          const newVal = Math.min(realCurrent + delta, target);
          state.progress[team][tile][drop] = newVal;

          if (pending.teamMessageId && teamCh) {
            const tm = await teamCh.messages.fetch(pending.teamMessageId).catch(() => null);
            if (tm) {
              const e2 = EmbedBuilder.from(base);
              await tm.edit({ embeds: [e2] }).catch(() => {});
            }
          }

          if (newVal >= target) {
            for (const [mid, p] of Object.entries(state.pending)) {
              if (p.kind === "drop" && p.team === team && (p as any).tile === tile && (p as any).drop === drop) {
                const m = await outCh.messages.fetch(mid).catch(() => null);
                if (m) {
                  const cur = EmbedBuilder.from(m.embeds[0] ?? new EmbedBuilder());
                  cur.setColor(0x2f3136)
                    .setDescription(`${(cur.data.description ?? "")}\n**AUTO-CANCELED:** target already met`);
                  await m.edit({ embeds: [cur] }).catch(() => {});
                }
                if (p.teamMessageId && teamCh) {
                  const tm = await teamCh.messages.fetch(p.teamMessageId).catch(() => null);
                  await tm?.edit({ content: "Canceled (target met)" }).catch(() => {});
                }
                delete state.pending[mid];
              }
            }
          }

          if (state.options.trackFirstLine && !state.firstLineAwardedTo) {
            if (checkAnyLineComplete(state as any, team)) {
              state.firstLineAwardedTo = team;
              if (state.announcementsChannelId) {
                const ann = reaction.message.guild!.channels.cache.get(state.announcementsChannelId) as TextChannel;
                await ann?.send({ embeds: [embed("First Line Complete! 🟩", `Team **${team}** is first to complete a line!`, COLORS.ok)] });
              }
            }
          }
          await onBoardCompleteMaybeAnnounce(reaction.message.guild!, state as any, team);
        } else {
          if (pending.teamMessageId && teamCh) {
            const tm = await teamCh.messages.fetch(pending.teamMessageId).catch(() => null);
            if (tm) {
              const denyDesc = `**DENIED** — ${drop} (${Math.min(snapshot + delta, target)}/${target}). Contact an admin.`;
              await tm.edit({ embeds: [embed("Drop Denied ❌", denyDesc, COLORS.err)] }).catch(() => {});
            }
          }
        }
      } else {
        const { userId, boss, team } = pending as any;
        if (emoji === "✅") {
          const set = new Set(state.chestVerifiedUsers[userId] ?? []);
          set.add(boss);
          state.chestVerifiedUsers[userId] = Array.from(set).sort();
        }

        if (pending.teamMessageId && (reaction.message.guild!.channels.cache.get(pending.submitChannelId) as TextChannel | undefined)) {
          const teamCh2 = reaction.message.guild!.channels.cache.get(pending.submitChannelId) as TextChannel;
          const tm = await teamCh2.messages.fetch(pending.teamMessageId).catch(() => null);
          if (tm) {
            const title = emoji === "✅" ? "Chest Verified ✅" : "Chest Denied ❌";
            const color = emoji === "✅" ? COLORS.ok : COLORS.err;
            await tm.edit({ embeds: [embed(title, `**${boss}** for <@${userId}>`, color)] }).catch(() => {});
          }
        }
      }

  await save(guildId, state);
    } catch (e) {
      console.error(e);
    }
  });
}
