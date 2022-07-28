import { Events, Message } from 'discord.js';
import { StatCollection } from '../database/stat-collection.js';
import { CustomEvent } from './custom-event.js';

export class StatMessage implements CustomEvent<Events.MessageCreate> {
    public readonly event = Events.MessageCreate;

    public async process(message: Message): Promise<void> {
        if (message.author.bot) return;
        if (!message.guild) return;
        StatCollection.fromGuild(message.guild).addMessage(message);
    }
}
