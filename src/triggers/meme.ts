import { Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import * as crypto from 'node:crypto';
import { getMatchRegexp, getMemeEmbed, MemeItem } from '../commands/config/meme.js';
import { EventData } from '../models/event-data.js';
import { MessageUtils } from '../utils/message-utils.js';
import { Trigger } from './trigger.js';

export class MemeTrigger implements Trigger {
    public requireGuild = true;

    private cooldown = new RateLimiter(1, 60 * 1000);

    public triggered(msg: Message): boolean {
        if (msg.author.bot) return false;
        return true;
    }

    public async execute(msg: Message, data: EventData): Promise<void> {
        if (!msg.guild || !data.guild?.memes?.length) return;

        const memes: MemeItem[] = data.guild?.memes;
        const matches: MemeItem[] = [];
        for (let i = 0; i < memes.length; i++) {
            const item = memes[i];
            const reg = getMatchRegexp(item);
            if (reg && msg.content.match(reg)) {
                matches.push(item);
            }
        }

        if (matches.length) {
            const limited = this.cooldown.take(msg.channelId);
            if (limited) return;

            const index = crypto.randomInt(matches.length);
            const embed = getMemeEmbed(msg.member ?? msg.author, matches[index]);
            await MessageUtils.send(msg.channel, embed);
            // StatCollection.fromGuild(msg.guild).addMeme(msg, matches[index].keyword);
        }
    }

}
