import { REST } from "@discordjs/rest";
import { Routes, type APIApplicationCommand } from "discord-api-types/v10";

/* ---------- helpers to force autocomplete & ordering ---------- */

function looksLike(name: string, prefix: string) {
  return name.toLowerCase().startsWith(prefix);
}

function shouldAutocomplete(name: string): boolean {
  const n = name.toLowerCase();
  return (
    looksLike(n, "boss") ||
    looksLike(n, "drop") ||
    looksLike(n, "team") ||
    looksLike(n, "tile") ||
    n === "position" ||
    n === "index"
  );
}

/** Sort options so required ones come first (Discord API requirement). */
function sortOptionsRequiredFirst(options?: any[]): any[] | undefined {
  if (!Array.isArray(options)) return options;

  const withIndex = options.map((opt, idx) => ({ opt, idx }));
  withIndex.sort((a, b) => {
    const ar = a.opt?.required ? 1 : 0;
    const br = b.opt?.required ? 1 : 0;
    if (ar !== br) return br - ar; // required before optional
    return a.idx - b.idx;
  });

  const sorted = withIndex.map(({ opt }) => {
    if (opt?.type === 1 || opt?.type === 2) {
      opt.options = sortOptionsRequiredFirst(opt.options);
    }
    return opt;
  });

  return sorted;
}

/** Walk options; set autocomplete flags and remove conflicting choices. */
function ensureAutocompleteOnOptions(options?: any[]) {
  if (!Array.isArray(options)) return;
  for (const o of options) {
    if (o?.name && shouldAutocomplete(o.name)) {
      o.autocomplete = true;
      if (Array.isArray(o.choices)) delete o.choices; // choices conflict with autocomplete
    }
    if (Array.isArray(o?.options)) ensureAutocompleteOnOptions(o.options);
  }
}

/** Sanitize a single command JSON object to satisfy Discord validations. */
function sanitizeCommand(cmd: any): any {
  const copy = { ...cmd };
  if (Array.isArray(copy.options)) {
    ensureAutocompleteOnOptions(copy.options);
    copy.options = sortOptionsRequiredFirst(copy.options);
    copy.options = copy.options?.map((o: any) => {
      if (o?.options) {
        ensureAutocompleteOnOptions(o.options);
        o.options = sortOptionsRequiredFirst(o.options);
      }
      return o;
    });
  }
  return copy;
}

/** Accept modules/builders/JSON and return sanitized raw JSON. */
export function normalizeCommandData(cmds: any[]): any[] {
  return cmds.map((c) => {
    const json = c?.data?.toJSON ? c.data.toJSON() : c?.toJSON ? c.toJSON() : c;
    return sanitizeCommand(json);
  });
}

export class Registrar {
  constructor(private rest: REST, private appId: string) {}

  async setGuildCommands(guildId: string, commands: APIApplicationCommand[] | any[]) {
    const payload = commands.map((c) => sanitizeCommand(c));
    await this.rest.put(Routes.applicationGuildCommands(this.appId, guildId), {
      body: payload as any[],
    });
  }
}

/** Prefer DISCORD_* names but fall back to BOT_TOKEN/APP_ID */
const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_CLIENT_ID;

export const registrar =
  token && appId ? new Registrar(new REST({ version: "10" }).setToken(token), appId) : null;

if (!registrar) {
  console.warn(
    "[registrar] Missing DISCORD_TOKEN/BOT_TOKEN or DISCORD_APP_ID/APP_ID; " +
      "falling back to guild.commands.set where used."
  );
}
