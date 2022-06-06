import config from 'config';
import { Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { CommandDeferType } from '../commands/command.js';
import { ButtonDeferType, Component, ComponentIntercation } from '../components/component.js';
import { getGuildRepository } from '../database/entities/guild.js';
import { getUserRepository } from '../database/entities/user.js';
import { EventData } from '../models/event-data.js';
import { InteractionUtils } from '../utils/index.js';
import { EventHandler } from './event-handler.js';

export class ComponentHandler implements EventHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.components.amount'),
        config.get<number>('rateLimiting.components.interval') * 1000
    );

    constructor(private components: Component[]) { }

    public async process(intr: ComponentIntercation, msg: Message): Promise<void> {
        // Don't respond to self, or other bots
        if (intr.user.id === intr.client.user?.id || intr.user.bot) {
            return;
        }

        // Check if user is rate limited
        const limited = this.rateLimiter.take(intr.user.id);
        if (limited) {
            return;
        }

        // Try to find the component the user wants
        const component = this.components.find(component => component.ids.includes(intr.customId));
        if (!component) {
            return;
        }

        if (component.requireGuild && !intr.guild) {
            return;
        }

        // Check if the embeds author equals the users tag
        if (component.requireEmbedAuthorTag && msg.embeds[0]?.author?.name !== intr.user.tag) {
            return;
        }

        // Defer interaction
        // NOTE: Anything after this point we should be responding to the interaction
        switch (component.deferType) {
            case ButtonDeferType.REPLY: {
                await InteractionUtils.deferReply(intr);
                break;
            }
            case ButtonDeferType.UPDATE: {
                await InteractionUtils.deferUpdate(intr);
                break;
            }
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
        if (component.deferType !== ButtonDeferType.NONE && !intr.deferred) {
            return;
        }

        const data = new EventData(
            await getUserRepository().findById(intr.user.id),
            intr.guild ? await getGuildRepository().findById(intr.guild.id) : undefined
        );

        // Execute the button
        await component.execute(intr, msg, data);
    }
}
