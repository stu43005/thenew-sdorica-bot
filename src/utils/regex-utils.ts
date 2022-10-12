import { APIPartialEmoji, resolvePartialEmoji } from 'discord.js';
import emojiRegex from 'emoji-regex';

export class RegexUtils {
    public static regex(input: string): RegExp | undefined {
        const match = input.match(/^\/(.*)\/([^/]*)$/);
        if (!match) {
            return;
        }

        return new RegExp(match[1], match[2]);
    }

    public static discordId(input: string): string | undefined {
        return input.match(/\b\d{17,20}\b/)?.[0];
    }

    public static tag(
        input: string
    ): { username: string; tag: string; discriminator: string } | undefined {
        const match = input.match(/\b(.+)#([\d]{4})\b/);
        if (!match) {
            return;
        }

        return {
            tag: match[0],
            username: match[1],
            discriminator: match[2],
        };
    }

    public static guildEmojis(input: string): APIPartialEmoji[] {
        const match = input.matchAll(/(<a?:[a-zA-Z0-9_]+:[0-9]+>)/g);
        return [...match]
            .map(g => this.guildEmoji(g[0]))
            .filter((emoji): emoji is APIPartialEmoji => !!emoji);
    }

    public static guildEmoji(input: string): APIPartialEmoji | undefined {
        const resolve = resolvePartialEmoji(input);
        if (!resolve || !resolve.id) {
            return;
        }

        return {
            id: resolve.id,
            name: resolve.name ?? null,
            animated: resolve.animated,
        };
    }

    public static emoji(input: string): string[] {
        return [...input.matchAll(emojiRegex())].map(match => match[0]);
    }
}
