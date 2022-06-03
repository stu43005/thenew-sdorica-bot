import config from 'config';
import { Message, MessageReaction, User } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { getGuildRepository } from '../database/entities/guild.js';
import { getUserRepository } from '../database/entities/user.js';
import { EventData } from '../models/event-data.js';
import { Reaction } from '../reactions/index.js';
import { EventHandler } from './index.js';

export class ReactionHandler implements EventHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.reactions.amount'),
        config.get<number>('rateLimiting.reactions.interval') * 1000
    );

    constructor(private reactions: Reaction[]) { }

    public async process(msgReaction: MessageReaction, msg: Message, reactor: User, remove: boolean): Promise<void> {
        // Don't respond to self, or other bots
        if (reactor.id === msgReaction.client.user?.id || reactor.bot) {
            return;
        }

        // Check if user is rate limited
        const limited = this.rateLimiter.take(msg.author.id);
        if (limited) {
            return;
        }

        // Try to find the reaction the user wants
        const reactions = this.reactions.filter(reaction => {
            if (reaction.requireGuild && !msg.guild) {
                return false;
            }

            if (reaction.requireSentByClient && msg.author.id !== msg.client.user?.id) {
                return false;
            }

            // Check if the embeds author equals the reactors tag
            if (reaction.requireEmbedAuthorTag && msg.embeds[0]?.author?.name !== reactor.tag) {
                return false;
            }

            if (reaction.requireRemove !== remove) {
                return false;
            }

            if (reaction.emoji && reaction.emoji !== msgReaction.emoji.name) {
                return false;
            }

            if (!reaction.triggered(msgReaction, msg, reactor)) {
                return false;
            }

            return true;
        });

        if (reactions.length === 0) {
            return;
        }

        const data = new EventData(
            await getUserRepository().findById(reactor.id),
            msg.guild ? await getGuildRepository().findById(msg.guild.id) : undefined
        );

        // Execute the reactions
        for (const reaction of reactions) {
            await reaction.execute(msgReaction, msg, reactor, data);
        }
    }
}
