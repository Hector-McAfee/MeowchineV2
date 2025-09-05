import { Client, Events, Interaction } from "discord.js";
import { handleAutocomplete } from "../autocomplete/index.js";

/** Call this once during startup to bind the autocomplete listener. */
export function registerAutocompleteListener(client: Client) {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    if (!interaction.isAutocomplete()) return;
    await handleAutocomplete(interaction);
  });
}
