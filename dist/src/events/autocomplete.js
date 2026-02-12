import { Events } from "discord.js";
import { handleAutocomplete } from "../autocomplete/index.js";
/** Call this once during startup to bind the autocomplete listener. */
export function registerAutocompleteListener(client) {
    client.on(Events.InteractionCreate, async (interaction) => {
        if (!interaction.isAutocomplete())
            return;
        await handleAutocomplete(interaction);
    });
}
