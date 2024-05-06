import { parseEmoji, type PartialEmoji, type PartialEmojiOnlyId } from 'discord.js';
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

    public static guildEmojis(input: string): PartialEmoji[] {
        const match = input.matchAll(/(<a?:[a-zA-Z0-9_]+:[0-9]+>)/g);
        return Array.from(match)
            .map(g => parseEmoji(g[0]))
            .filter((emoji): emoji is PartialEmoji => !!emoji);
    }

    public static guildEmoji(input: string): PartialEmoji | PartialEmojiOnlyId | null {
        if (/^\d{17,19}$/.test(input)) {
            return { id: input };
        }

        return parseEmoji(input);
    }

    public static emoji(input: string): string[] {
        return [...input.matchAll(emojiRegex())].map(match => match[0]);
    }
}
