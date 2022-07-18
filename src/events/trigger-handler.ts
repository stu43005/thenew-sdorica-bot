import config from 'config';
import { Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { getGuildRepository } from '../database/entities/guild.js';
import { getUserRepository } from '../database/entities/user.js';
import { EventData } from '../models/event-data.js';
import { Trigger } from '../triggers/trigger.js';

export class TriggerHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.triggers.amount'),
        config.get<number>('rateLimiting.triggers.interval') * 1000
    );

    constructor(private triggers: Trigger[]) {}

    public async process(msg: Message): Promise<void> {
        // Check if user is rate limited
        const limited = this.rateLimiter.take(msg.author.id);
        if (limited) {
            return;
        }

        // Find triggers caused by this message
        const triggers = this.triggers.filter(trigger => {
            if (trigger.requireGuild && !msg.guild) {
                return false;
            }

            if (!trigger.triggered(msg)) {
                return false;
            }

            return true;
        });

        // If this message causes no triggers then return
        if (triggers.length === 0) {
            return;
        }

        const data = new EventData(
            await getUserRepository().findById(msg.author.id),
            msg.guild ? await getGuildRepository().findById(msg.guild.id) : undefined
        );

        // Execute triggers
        for (const trigger of triggers) {
            await trigger.execute(msg, data);
        }
    }
}
