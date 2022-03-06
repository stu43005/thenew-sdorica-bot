import config from 'config';
import { ButtonInteraction, Message } from 'discord.js';
import { RateLimiter } from 'discord.js-rate-limiter';
import { Button, ButtonDeferType } from '../buttons/index.js';
import { EventData } from '../models/internal-models.js';
import { InteractionUtils } from '../utils/index.js';
import { EventHandler } from './index.js';

export class ButtonHandler implements EventHandler {
    private rateLimiter = new RateLimiter(
        config.get<number>('rateLimiting.buttons.amount'),
        config.get<number>('rateLimiting.buttons.interval') * 1000
    );

    constructor(private buttons: Button[]) { }

    public async process(intr: ButtonInteraction, msg: Message): Promise<void> {
        // Don't respond to self, or other bots
        if (intr.user.id === intr.client.user?.id || intr.user.bot) {
            return;
        }

        // Check if user is rate limited
        let limited = this.rateLimiter.take(intr.user.id);
        if (limited) {
            return;
        }

        // Try to find the button the user wants
        let button = this.findButton(intr.customId);
        if (!button) {
            return;
        }

        if (button.requireGuild && !intr.guild) {
            return;
        }

        // Check if the embeds author equals the users tag
        if (button.requireEmbedAuthorTag && msg.embeds[0]?.author?.name !== intr.user.tag) {
            return;
        }

        // Defer interaction
        // NOTE: Anything after this point we should be responding to the interaction
        switch (button.deferType) {
            case ButtonDeferType.REPLY: {
                await InteractionUtils.deferReply(intr);
                break;
            }
            case ButtonDeferType.UPDATE: {
                await InteractionUtils.deferUpdate(intr);
                break;
            }
        }

        // Return if defer was unsuccessful
        if (button.deferType !== ButtonDeferType.NONE && !intr.deferred) {
            return;
        }

        // TODO: Get data from database
        let data = new EventData();

        // Execute the button
        await button.execute(intr, msg, data);
    }

    private findButton(id: string): Button {
        return this.buttons.find(button => button.ids.includes(id));
    }
}
