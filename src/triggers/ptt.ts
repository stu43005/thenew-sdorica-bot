import { Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { pttAutoEmbed, pttUrlRegex } from '../commands/fun/ptt.js';
import { EventData } from '../models/event-data.js';
import { MessageUtils } from '../utils/message-utils.js';
import { Trigger } from './trigger.js';

export class PttTrigger implements Trigger {
    public requireGuild = false;

    private cooldown = new RateLimiter(1, 60 * 1000);

    public triggered(msg: Message): boolean {
        if (msg.author.bot) return false;

        const limited = this.cooldown.take(msg.author.id);
        if (limited) return false;

        return !!msg.content.match(pttUrlRegex);
    }

    public async execute(msg: Message, _data: EventData): Promise<void> {
        const embed = await pttAutoEmbed(msg.content);
        if (embed) {
            await MessageUtils.reply(msg, embed);
        }
    }

}
