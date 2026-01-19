import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  PermissionFlagsBits,
} from "discord.js";
import { embed, isAdmin } from "../../util.js";
import { load, save } from "../../state/store.js";
import { MAX_TILES } from "../../config.js";
import { canonBossName } from "../../autocomplete/data.js";

/** ---------------------- Builders ---------------------- */

export const add_boss = new SlashCommandBuilder()
  .setName("add_boss")
  .setDescription("Set the boss for a tile (admin)")
  .addIntegerOption(o =>
    o.setName("tile").setDescription("Tile number").setRequired(true).setAutocomplete(true)
  )
  .addStringOption(o =>
    o.setName("boss").setDescription("Boss name").setRequired(true).setAutocomplete(true)
  )
  .addBooleanOption(o =>
    o.setName("or").setDescription("If true, any one drop can complete the tile")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const add_drop = new SlashCommandBuilder()
  .setName("add_drop")
  .setDescription("Add a drop target to a boss’s tile (admin)")
  .addStringOption(o =>
    o.setName("boss").setDescription("Boss (already set on a tile)").setRequired(true).setAutocomplete(true)
  )
  .addStringOption(o =>
    o.setName("drop").setDescription("Drop label (from presets)").setRequired(true).setAutocomplete(true)
  )
  .addIntegerOption(o =>
    o.setName("amount").setDescription("Target amount for this drop").setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const remove_boss = new SlashCommandBuilder()
  .setName("remove_boss")
  .setDescription("Clear the boss & drops for a tile (admin)")
  .addIntegerOption(o =>
    o.setName("tile").setDescription("Tile number").setRequired(true).setAutocomplete(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const remove_drop = new SlashCommandBuilder()
  .setName("remove_drop")
  .setDescription("Remove a configured drop from a tile (admin)")
  .addIntegerOption(o =>
    o.setName("tile").setDescription("Tile number").setRequired(true).setAutocomplete(true)
  )
  .addStringOption(o =>
    o.setName("drop").setDescription("Drop label").setRequired(true).setAutocomplete(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export const set_teams_drop = new SlashCommandBuilder()
  .setName("set_teams_drop")
  .setDescription("Manually set a team's verified count for a drop (admin)")
  .addIntegerOption(o =>
    o.setName("team").setDescription("Team number").setRequired(true).setAutocomplete(true)
  )
  .addStringOption(o =>
    o.setName("boss").setDescription("Boss (as shown on the board)").setRequired(true).setAutocomplete(true)
  )
  .addStringOption(o =>
    o.setName("drop").setDescription("Drop label").setRequired(true).setAutocomplete(true)
  )
  .addIntegerOption(o =>
    o.setName("amount").setDescription("Verified amount").setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

/** ---------------------- Execs ---------------------- */

export async function exec_add_boss(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) {
    return i.reply({ embeds: [embed("Admin Only", "No permission.")], flags: 64 });
  }
  const tile = i.options.getInteger("tile", true);
  const bossInput = i.options.getString("boss", true);
  const orMode = i.options.getBoolean("or") ?? false;

  const s = await load(i.guildId!);
  const cap = MAX_TILES[s.options.boardSize];
  if (tile < 1 || tile > cap) {
    return i.reply({ embeds: [embed("Invalid Tile", `Tile must be **1..${cap}**`)], flags: 64 });
  }

  // store exactly what the admin typed (but you could store canonical if you prefer)
  s.tiles[tile] = { boss: bossInput, drops: {}, mode: orMode ? "OR" : "AND" };
  await save(i.guildId!, s);

  await i.reply({
    embeds: [
      embed(
        "Boss Set",
        `Tile **${tile}** → **${bossInput}**\nMode: **${orMode ? "OR" : "AND"}**`
      ),
    ],
  });
}

export async function exec_add_drop(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) {
    return i.reply({ embeds: [embed("Admin Only", "No permission.")], flags: 64 });
  }

  const bossInput = i.options.getString("boss", true);
  const drop = i.options.getString("drop", true);
  const amount = i.options.getInteger("amount", true);
  if (amount < 1 || amount > 1_000_000) {
    return i.reply({ embeds: [embed("Invalid Amount", "1..1,000,000")], flags: 64 });
  }

  const s = await load(i.guildId!);

  // find the tile where this boss is set (strict first, then canonical compare)
  let tileNum: number | null = null;
  for (const [tileStr, data] of Object.entries<any>(s.tiles ?? {})) {
    const stored = (data?.boss ?? "").trim();
    if (stored && stored.toLowerCase() === bossInput.toLowerCase()) {
      tileNum = Number(tileStr);
      break;
    }
  }
  if (tileNum === null) {
    const inputCanon = canonBossName(bossInput);
    for (const [tileStr, data] of Object.entries<any>(s.tiles ?? {})) {
      const stored = (data?.boss ?? "").trim();
      const storedCanon = canonBossName(stored);
      if (stored && storedCanon && storedCanon.toLowerCase() === (inputCanon ?? "").toLowerCase()) {
        tileNum = Number(tileStr);
        break;
      }
    }
  }

  if (tileNum === null) {
    return i.reply({
      embeds: [embed("Boss Not On Board", "Pick a boss already placed with /add_boss.")],
      flags: 64,
    });
  }

  s.tiles[tileNum] ??= { boss: bossInput, drops: {}, mode: "AND" };
  s.tiles[tileNum].drops[drop] = amount;

  // ensure progress shape exists for all teams
  for (const team of Object.keys(s.teamToChannel ?? {})) {
    s.progress[team] ??= {};
    s.progress[team][tileNum] ??= {};
    s.progress[team][tileNum][drop] ??= 0;
  }

  await save(i.guildId!, s);
  await i.reply({
    embeds: [
      embed("Drop Added", `**${bossInput}** · **${drop} x${amount}** (Tile **${tileNum}**)`),
    ],
  });
}

export async function exec_remove_boss(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) {
    return i.reply({ embeds: [embed("Admin Only","No permission.")], flags: 64 });
  }
  const tile = i.options.getInteger("tile", true);
  const s = await load(i.guildId!);

  delete s.tiles[tile];
  for (const team of Object.keys(s.progress)) delete s.progress[team]?.[tile];
  for (const [mid, p] of Object.entries(s.pending)) {
    if (p.kind === "drop" && (p as any).tile === tile) delete s.pending[mid];
  }
  await save(i.guildId!, s);
  await i.reply({ embeds: [embed("Tile Cleared", `Tile **${tile}** cleared.`)]});
}

export async function exec_remove_drop(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) {
    return i.reply({ embeds: [embed("Admin Only","No permission.")], flags: 64 });
  }
  const tile = i.options.getInteger("tile", true);
  const drop = i.options.getString("drop", true);
  const s = await load(i.guildId!);
  if (!s.tiles[tile]?.drops?.[drop]) {
    return i.reply({ embeds: [embed("Drop Not Found", "Check tile & drop.")], flags: 64 });
  }

  delete s.tiles[tile].drops[drop];
  for (const team of Object.keys(s.progress)) delete s.progress[team]?.[tile]?.[drop];
  for (const [mid, p] of Object.entries(s.pending)) {
    if (p.kind === "drop" && (p as any).tile === tile && (p as any).drop === drop) delete s.pending[mid];
  }
  await save(i.guildId!, s);
  await i.reply({ embeds: [embed("Drop Removed", `Removed **${drop}** from Tile **${tile}**.`)]});
}

export async function exec_set_teams_drop(i: ChatInputCommandInteraction) {
  if (!isAdmin(i.member as any)) {
    return i.reply({ embeds: [embed("Admin Only","No permission.")], flags: 64 });
  }
  const team = i.options.getInteger("team", true).toString();
  const bossInput = i.options.getString("boss", true);
  const drop = i.options.getString("drop", true);
  const amount = i.options.getInteger("amount", true);
  const s = await load(i.guildId!);

  // resolve boss -> tile
  let tile: number | null = null;
  for (const [tileStr, data] of Object.entries<any>(s.tiles ?? {})) {
    const stored = (data?.boss ?? "").trim();
    if (stored && stored.toLowerCase() === bossInput.toLowerCase()) {
      tile = Number(tileStr);
      break;
    }
  }
  if (tile === null) {
    const inputCanon = canonBossName(bossInput);
    for (const [tileStr, data] of Object.entries<any>(s.tiles ?? {})) {
      const stored = (data?.boss ?? "").trim();
      const storedCanon = canonBossName(stored);
      if (stored && storedCanon && storedCanon.toLowerCase() === (inputCanon ?? "").toLowerCase()) {
        tile = Number(tileStr);
        break;
      }
    }
  }

  if (tile === null) {
    return i.reply({ embeds: [embed("Boss Not On Board", "Pick a boss already placed with /add_boss.")], flags: 64 });
  }

  const target = s.tiles[tile]?.drops?.[drop];
  if (!target) {
    return i.reply({ embeds: [embed("Unknown", "Tile/Drop not configured.")], flags: 64 });
  }

  const newVal = Math.max(0, Math.min(amount, target));
  s.progress[team] ??= {};
  s.progress[team][tile] ??= {};
  s.progress[team][tile][drop] = newVal;
  await save(i.guildId!, s);
  await i.reply({
    embeds: [
      embed("Progress Updated", `Team **${team}** · Tile **${tile}** · **${drop}** → **${newVal}/${target}**`),
    ],
  });
}
