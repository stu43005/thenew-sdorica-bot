import config from 'config';
import { Message, PartialMessage } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { getGuildRepository } from '../database/entities/guild.js';
import { getUserRepository } from '../database/entities/user.js';
import { EventData } from '../models/event-data.js';
import { Logger } from '../services/logger.js';
import { Trigger } from '../triggers/trigger.js';

export class TriggerHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.triggers.amount'),
        config.get<number>('rateLimiting.triggers.interval') * 1000
    );

    constructor(private triggers: Trigger[]) {}

    public async process(msg: Message, oldMsg?: Message | PartialMessage): Promise<void> {
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

            if (oldMsg && !trigger.onUpdate) {
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
        Logger.debug(`Message start process: ${msg.url}`);
        for (const trigger of triggers) {
            if (oldMsg) {
                await trigger.onUpdate?.(oldMsg, msg, data);
            } else {
                await trigger.execute(msg, data);
            }
        }
        Logger.debug(`Message end process: ${msg.url}`);
    }
}
