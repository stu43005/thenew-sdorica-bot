import { escapeMarkdown, EscapeMarkdownOptions } from 'discord.js';
import crypto from 'node:crypto';

export class StringUtils {
    public static truncate(input: string, length: number, addEllipsis: boolean = false): string {
        if (input.length <= length) {
            return input;
        }

        let output = input.substring(0, addEllipsis ? length - 3 : length);
        if (addEllipsis) {
            output += '...';
        }

        return output;
    }

    public static discordEscape(input: string, options: EscapeMarkdownOptions): string {
        return escapeMarkdown(input, options);
    }

    public static createContentDigest(obj: unknown): string {
        if (typeof obj === 'string') {
            return crypto.createHash('md5').update(obj).digest('hex');
        }
        return crypto.createHash('md5').update(JSON.stringify(obj)).digest('hex');
    }
}
