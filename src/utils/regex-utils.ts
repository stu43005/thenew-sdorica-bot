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

    public static guildEmoji(
        input: string
    ): { animated?: boolean; name?: string; discordId: string } | undefined {
        const match = input.match(/^(?:<(a?):([a-zA-Z0-9_]+):)?(\d{17,20})>?$/);
        if (!match) {
            return;
        }

        if (!match[2]) {
            return {
                discordId: match[3],
            };
        }

        return {
            animated: match[1] === 'a',
            name: match[2],
            discordId: match[3],
        };
    }

    public static emoji(input: string): string[] {
        return [...input.matchAll(emojiRegex())].map(match => match[0]);
    }
}
