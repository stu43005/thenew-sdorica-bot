import { Events, MessageReaction, PartialMessageReaction, PartialUser, User } from 'discord.js';
import { StatCollection } from '../database/stat-collection.js';
import { CustomEvent } from './custom-event.js';

export class StatReaction implements CustomEvent<Events.MessageReactionAdd> {
    public readonly event = Events.MessageReactionAdd;

    public async process(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
        if (user.bot) return;
        if (!reaction.message.guild) return;
        StatCollection.fromGuild(reaction.message.guild).addReaction(reaction, user);
    }
}
