import config from 'config';
import { Message, ModalSubmitInteraction } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { CommandDeferType } from '../commands/command.js';
import { getGuildRepository } from '../database/entities/guild.js';
import { getUserRepository } from '../database/entities/user.js';
import { ModelSubmit } from '../model-submits/model-submit.js';
import { EventData } from '../models/event-data.js';
import { Logger } from '../services/logger.js';
import { InteractionUtils } from '../utils/index.js';
import { EventHandler } from './index.js';

export class ModelSubmitHandler implements EventHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.modelSubmits.amount'),
        config.get<number>('rateLimiting.modelSubmits.interval') * 1000
    );

    constructor(private modelSubmits: ModelSubmit[]) { }

    public async process(intr: ModalSubmitInteraction, msg: Message): Promise<void> {
        // Don't respond to self, or other bots
        if (intr.user.id === intr.client.user?.id || intr.user.bot) {
            return;
        }

        // Check if user is rate limited
        const limited = this.rateLimiter.take(intr.user.id);
        if (limited) {
            return;
        }

        // Try to find the submit the user wants
        Logger.debug(`Find ModelSubmit customId: ${intr.customId}`);
        const modelSubmit = this.findModelSubmit(intr.customId);
        if (!modelSubmit) {
            return;
        }

        if (modelSubmit.requireGuild && !intr.guild) {
            return;
        }

        // Check if the embeds author equals the users tag
        if (modelSubmit.requireEmbedAuthorTag && msg.embeds[0]?.author?.name !== intr.user.tag) {
            return;
        }

        // Defer interaction
        // NOTE: Anything after this point we should be responding to the interaction
        switch (modelSubmit.deferType) {
            case CommandDeferType.PUBLIC: {
                await InteractionUtils.deferReply(intr, false);
                break;
            }
            case CommandDeferType.HIDDEN: {
                await InteractionUtils.deferReply(intr, true);
                break;
            }
        }

        // Return if defer was unsuccessful
        if (modelSubmit.deferType !== CommandDeferType.NONE && !intr.deferred) {
            return;
        }

        const data = new EventData(
            await getUserRepository().findById(intr.user.id),
            intr.guild ? await getGuildRepository().findById(intr.guild.id) : undefined
        );

        // Execute the submit
        Logger.debug(`Run ModelSubmit: ${intr.customId}`);
        await modelSubmit.execute(intr, msg, data);
    }

    private findModelSubmit(id: string): ModelSubmit | undefined {
        return this.modelSubmits.find(modelSubmit => modelSubmit.ids.includes(id));
    }
}
