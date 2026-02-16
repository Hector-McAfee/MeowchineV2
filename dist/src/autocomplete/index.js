import { suggestTileNumbers, suggestEmptyTileNumbers, suggestBossesForSetup, suggestAllCatalogBosses, suggestDropsForBoss, suggestSubmitDropsForBoss, suggestUsedBosses, suggestChestTargets, } from "./data.js";
function isUnknownInteractionError(err) {
    if (!err || typeof err !== "object")
        return false;
    const anyErr = err;
    return anyErr?.code === 10062 || anyErr?.rawError?.code === 10062;
}
async function safeRespond(i, choices) {
    if (i.responded)
        return;
    const payload = Array.isArray(choices) ? choices.slice(0, 25) : [];
    try {
        await i.respond(payload);
    }
    catch (err) {
        if (isUnknownInteractionError(err))
            return;
        throw err;
    }
}
// Load catalog once (boss -> drops[]). Keep path aligned with your repo.
let BOSS_CATALOG = {};
try {
    BOSS_CATALOG = (await import("../../assets/catalog/boss_catalog.json", {
        assert: { type: "json" },
    })).default;
}
catch {
    // Fallback to empty; you'll just see no suggestions for drops.
    BOSS_CATALOG = {};
}
export async function handleAutocomplete(i) {
    try {
        const name = i.commandName;
        const focused = i.options.getFocused(true);
        // --- Setup commands ---
        if (name === "add_boss") {
            if (focused.name === "tile")
                return safeRespond(i, await suggestEmptyTileNumbers(i));
            if (focused.name === "boss")
                return safeRespond(i, await suggestAllCatalogBosses(i, BOSS_CATALOG));
        }
        if (name === "add_drop") {
            if (focused.name === "boss")
                return safeRespond(i, await suggestBossesForSetup(i));
            if (focused.name === "drop")
                return safeRespond(i, await suggestDropsForBoss(i, BOSS_CATALOG));
            if (focused.name === "amount")
                return safeRespond(i, [{ name: "1", value: 1 }, { name: "2", value: 2 }, { name: "3", value: 3 }]);
        }
        if (name === "set_teams_drop") {
            if (focused.name === "boss")
                return safeRespond(i, await suggestUsedBosses(i));
            if (focused.name === "drop")
                return safeRespond(i, await suggestSubmitDropsForBoss(i));
        }
        if (name === "remove_boss") {
            if (focused.name === "tile")
                return safeRespond(i, await suggestTileNumbers(i));
        }
        if (name === "remove_drop") {
            if (focused.name === "tile")
                return safeRespond(i, await suggestTileNumbers(i));
            if (focused.name === "drop")
                return safeRespond(i, await suggestDropsForBoss(i, BOSS_CATALOG));
        }
        // --- Player/admin (outside setup) use bosses on the board only ---
        if (name === "submit_drop") {
            if (focused.name === "boss")
                return safeRespond(i, await suggestUsedBosses(i));
            if (focused.name === "drop")
                return safeRespond(i, await suggestSubmitDropsForBoss(i));
        }
        // Suggest team numbers for any command that requests a team, except the
        // special-case /set_input which expects manual integer input from an admin.
        if (focused.name === "team" && name !== "set_input") {
            // Import here to avoid circular import problems in some setups
            const { suggestTeamsForGuild } = await import("./data.js");
            return safeRespond(i, await suggestTeamsForGuild(i));
        }
        // --- Chest verification submission (player) ---
        // Ensure your command's option for the chest target is named "boss".
        // If your command name differs, add it here too.
        if (["submit_chest", "verify_chest", "chest_verify", "manual_chest_verify"].includes(name)) {
            if (focused.name === "boss") {
                return safeRespond(i, await suggestChestTargets(i));
            }
        }
        // Default: nothing
        return safeRespond(i, []);
    }
    catch (err) {
        // Never throw from an autocomplete handler; just fail quietly.
        try {
            return safeRespond(i, []);
        }
        catch {
            // ignore
        }
    }
}
