import fs from "fs";
import path from "path";
import { AttachmentBuilder, EmbedBuilder } from "discord.js";
import { ICONS_DIR, COLORS } from "./config.js";
export const normalize = (s) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-");
export const ensureDir = (p) => { if (!fs.existsSync(p))
    fs.mkdirSync(p, { recursive: true }); };
export const embed = (title, desc = "", color = COLORS.info) => new EmbedBuilder().setTitle(title).setDescription(desc && desc.length > 0 ? desc : null).setColor(color);
export const isAdmin = (m) => !!m && (m.permissions.has("Administrator") || m.permissions.has("ManageGuild") || m.permissions.has("ManageMessages"));
export const safeIconName = (boss) => normalize(boss).replace(/[^a-z0-9]+/g, "_") || "unknown";
export const bossIconPath = (boss) => {
    const base = normalize(boss);
    // Candidate normalizations to try first
    const candidates = [
        safeIconName(boss),
        base.replace(/[^a-z0-9]+/g, "_"), // underscores
        base.replace(/[^a-z0-9]+/g, ""), // stripped
        base.replace(/[^a-z0-9]+/g, "-"), // hyphen
    ];
    for (const c of candidates) {
        const p = path.join(ICONS_DIR, `${c}.png`);
        if (fs.existsSync(p))
            return p;
    }
    // Fuzzy token-based matching against files in the icons dir
    try {
        if (fs.existsSync(ICONS_DIR)) {
            const files = fs.readdirSync(ICONS_DIR).map((f) => f.toLowerCase());
            const tokens = base.split(/[^a-z0-9]+/).filter(Boolean).sort((a, b) => b.length - a.length);
            // Try alias keys that map to this canonical name (helps with short names like 'telos')
            try {
                const aliasPath = path.resolve(process.cwd(), "assets", "config", "aliases.json");
                if (fs.existsSync(aliasPath)) {
                    const raw = JSON.parse(fs.readFileSync(aliasPath, "utf8") || "{}");
                    for (const [k, v] of Object.entries(raw)) {
                        if (typeof v === "string" && normalize(String(v)) === base) {
                            const ak = normalize(k);
                            if (!tokens.includes(ak))
                                tokens.unshift(ak);
                        }
                    }
                }
            }
            catch {
                // ignore alias read errors
            }
            for (const t of tokens) {
                // Exact filename without extension
                const exact = files.find((f) => f.replace(/\.png$/, "") === t);
                if (exact)
                    return path.join(ICONS_DIR, exact);
                // Filename that contains the token
                const incl = files.find((f) => f.includes(t));
                if (incl)
                    return path.join(ICONS_DIR, incl);
            }
        }
    }
    catch {
        // ignore fs errors and fall through to fallback
    }
    // Final fallback
    return path.join(ICONS_DIR, `${safeIconName(boss)}.png`);
};
export const fileFromBuffer = (buf, name) => new AttachmentBuilder(buf, { name });
