import "dotenv/config";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import { REST } from "@discordjs/rest";
import { minimal, full, handlers } from "./commands/index.js";
import { Registrar } from "./services/registrar.js";
import { load } from "./state/store.js";
import { wireReactionHandler } from "./events/reactions.js";
import { scheduleDailyRankings } from "./services/dailyRankings.js";
import { handleAutocomplete } from "./autocomplete/index.js";
const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_CLIENT_ID;
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});
console.log(token, appId);
const rest = new REST({ version: "10" }).setToken(token);
const registrar = new Registrar(rest, appId);
client.once(Events.ClientReady, async (c) => {
    console.log(`Logged in as ${c.user.tag}`);
    for (const [gid] of client.guilds.cache) {
        const s = await load(gid);
        const body = s.active ? full : minimal;
        await registrar.setGuildCommands(gid, body).catch(console.error);
    }
    wireReactionHandler(client);
    scheduleDailyRankings(client);
});
client.on(Events.GuildCreate, async (guild) => {
    const s = await load(guild.id);
    const body = s.active ? full : minimal;
    await registrar.setGuildCommands(guild.id, body).catch(console.error);
});
client.on("interactionCreate", async (interaction) => {
    try {
        if (interaction.isAutocomplete()) {
            return handleAutocomplete(interaction);
        }
        if (interaction.isChatInputCommand()) {
            // your command dispatcher
        }
    }
    catch (err) {
        console.error("[interaction] error:", err);
    }
});
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const name = interaction.commandName;
    const fn = handlers[name];
    if (!fn) {
        return interaction.reply({ content: "Command not implemented.", ephemeral: true }).catch(() => { });
    }
    try {
        await fn(interaction);
    }
    catch (e) {
        console.error(e);
        if (interaction.deferred || interaction.replied) {
            await interaction.followUp({ content: "An error occurred.", ephemeral: true }).catch(() => { });
        }
        else {
            await interaction.reply({ content: "An error occurred.", ephemeral: true }).catch(() => { });
        }
    }
});
client.login(token);
