import { Message } from 'discord.js';
import { EventHandler } from './event-handler.js';
import { TriggerHandler } from './trigger-handler.js';

export class MessageHandler implements EventHandler {
    constructor(private triggerHandler: TriggerHandler) { }

    public async process(msg: Message): Promise<void> {
        // Don't respond to system messages or self
        if (msg.system || msg.author.id === msg.client.user?.id) {
            return;
        }

        // Process trigger
        await this.triggerHandler.process(msg);
    }
}
