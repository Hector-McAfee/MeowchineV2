import {
  Client,
  EmbedBuilder,
  Message,
  type GuildTextBasedChannel,
  type MessageReaction,
  type User,
  type Collection,
} from "discord.js";
import { BOARD_SIZES, REACTIONS, COLORS, type BoardSize } from "../config.js";
import type { EventState } from "../state/types.js";
import { embed } from "../util.js";
import { load, save } from "../state/store.js";
import { full } from "../commands/index.js";
import { registrar, normalizeCommandData } from "./registrar.js";

export async function startBingoCreateSession(client: Client, msg: Message) {
  if (!msg.inGuild()) return;

  const guildId = msg.guild!.id;
  const state = await load(guildId);

  let boardSize: BoardSize = "3x3";
  let daily = false;
  let chest = false;
  let allowPlayersCheck = false;
  let firstLine = false;
  let playerStats = false;

  const em = embed(
    "Bingo Setup",
    "React to configure:\n" +
      `${REACTIONS.size3} = 3x3  |  ${REACTIONS.size4} = 4x4  |  ${REACTIONS.size5} = 5x5\n` +
      `${REACTIONS.toggleDaily} = Toggle Daily Rankings (12:00 GMT)\n` +
      `${REACTIONS.toggleChest} = Toggle Chest Verification\n` +
      `${REACTIONS.toggleCheckTeams} = Toggle /check_team for all players\n` +
      `${REACTIONS.toggleFirstLine} = Track First Line Completion\n` +
      `${REACTIONS.togglePlayerStats} = Track Player Stats (/check_stats)\n` +
      `${REACTIONS.confirm} = Confirm & Create`
  ).setColor(COLORS.pending);

  const ch = msg.channel as GuildTextBasedChannel;
  const prompt = await ch.send({ embeds: [em] });

  // Add all reactions
  for (const r of Object.values(REACTIONS)) {
    await prompt.react(r as string).catch(() => {});
  }

  const collector = prompt.createReactionCollector({
    time: 10 * 60_000,
    dispose: false,
  });

  collector.on("collect", async (reaction: MessageReaction, user: User) => {
    if (user.bot) return;

    const emoji = reaction.emoji.name ?? "";

    // Size selection
    if (Object.prototype.hasOwnProperty.call(BOARD_SIZES, emoji)) {
      // Remove user's other size reactions (keep single choice)
      for (const key of [REACTIONS.size3, REACTIONS.size4, REACTIONS.size5]) {
        if (key !== emoji) {
          const other = prompt.reactions.resolve(key as string);
          if (other) {
            await other.users.remove(user.id).catch(() => {});
          }
        }
      }
      boardSize = BOARD_SIZES[emoji as keyof typeof BOARD_SIZES];
    } else if (emoji === REACTIONS.toggleDaily) {
      daily = !daily;
    } else if (emoji === REACTIONS.toggleChest) {
      chest = !chest;
    } else if (emoji === REACTIONS.toggleCheckTeams) {
      allowPlayersCheck = !allowPlayersCheck;
    } else if (emoji === REACTIONS.toggleFirstLine) {
      firstLine = !firstLine;
    } else if (emoji === REACTIONS.togglePlayerStats) {
      playerStats = !playerStats;
    } else if (emoji === REACTIONS.confirm) {
      collector.stop("confirmed");

      // Persist new event state
  const s: EventState = {
        ...state,
        active: true,
        started: true,
        options: {
          boardSize,
          dailyUpdates: daily,
          chestVerify: chest,
          allowPlayersCheckTeams: allowPlayersCheck,
          trackFirstLine: firstLine,
          trackPlayerStats: playerStats,
        },
        tiles: {},
        progress: {},
        pending: {},
        chestVerifiedUsers: {},
        placements: [],
        stats: state.stats ?? [],
      };
  await save(guildId, s);

      // Register full command set for this guild immediately.
      try {
        const payload = normalizeCommandData(full as any[]);
        if (registrar) {
          await registrar.setGuildCommands(guildId, payload);
          console.log(`[registrar] Registered ${payload.length} commands for guild ${guildId}`);
        } else {
          // Fallback if env not set for REST
          // ApplicationCommandManager accepts builders/JSON
          await msg.guild!.commands.set(payload as any);
          console.log(`[registrar:fallback] Registered ${payload.length} commands via guild.commands.set for ${guildId}`);
        }
      } catch (err) {
        console.error("[registrar] Failed to register commands after bingo creation:", err);
        // surface a minimal notice in the setup message so admins know to investigate
      }

      const out = embed(
        "Bingo Created ✅",
        `Board: **${boardSize}**\n` +
          `Daily rankings: **${daily ? "ON" : "OFF"}**\n` +
          `Chest verification: **${chest ? "ON" : "OFF"}**\n` +
          `Players can /check_team: **${allowPlayersCheck ? "YES" : "NO"}**\n` +
          `Track first line: **${firstLine ? "ON" : "OFF"}**\n` +
          `Track player stats: **${playerStats ? "ON" : "OFF"}**\n\n` +
          `Now use **/set_output**, **/set_input**, **/set_announcments**, and configure tiles with **/add_boss**, **/add_drop**.`
      ).setColor(COLORS.ok);

      await prompt.edit({ embeds: [out] }).catch(() => {});
      return;
    }

    const status =
      `Size: ${boardSize} • Daily:${daily ? "ON" : "OFF"} • Chest:${chest ? "ON" : "OFF"} ` +
      `• CheckTeams:${allowPlayersCheck ? "YES" : "NO"} • FirstLine:${firstLine ? "ON" : "OFF"} ` +
      `• Stats:${playerStats ? "ON" : "OFF"}`;

    const base = prompt.embeds[0];
    const cur = (base ? EmbedBuilder.from(base) : embed("Bingo Setup", "React to configure."))
      .setFooter({ text: status });

    await prompt.edit({ embeds: [cur] }).catch(() => {});
  });

  collector.on(
    "end",
    async (_: Collection<string, MessageReaction>, reason: string) => {
      if (reason !== "confirmed") {
        const fin = embed(
          "Bingo Setup",
          "Setup window closed. Run **/bingo_create** again to restart."
        ).setColor(COLORS.warn);
        await prompt.edit({ embeds: [fin] }).catch(() => {});
      }
    }
  );
}
